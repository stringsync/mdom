import { beforeEach, describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import type { MElement } from './m-node';
import type { Measure } from './measure';
import { schemaErrors } from './music-xml-schema';
import type { Part } from './part';

describe('Guitar Pro notation pitches', () => {
	let document: MDocument;
	let part: Part;
	let measure: Measure;
	let serializer: GuitarProSerializer;
	let parser: GuitarProParser;

	beforeEach(() => {
		document = MDocument.empty();
		part = document.score.addPart({ name: 'Piano' });
		measure = part.addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: 'G', line: 2 });
		serializer = new GuitarProSerializer();
		parser = new GuitarProParser();
	});

	it('writes distinct native playback pitches for a notation-only melody', async () => {
		const voice = measure.getOrCreateVoice('1');
		voice.addNote({ step: 'C', octave: 3, type: 'quarter' });
		voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		voice.addNote({ step: 'E', octave: 5, type: 'quarter' });
		voice.addNote({ step: 'F', alter: 1, octave: 4, type: 'quarter' });
		const root = await gpif(await serializer.serializeToBytes(document));
		const tuning = root
			.child('Tracks')!
			.child('Track')!
			.child('Staves')!
			.child('Staff')!
			.child('Properties')!
			.childrenNamed('Property')
			.find((p) => p.getAttribute('name') === 'Tuning')!
			.child('Pitches')!
			.text!.split(' ')
			.map(Number);
		const notes = root.child('Notes')!.childrenNamed('Note');

		expect(
			notes.map(
				(note) => tuning[property(note, 'String')]! + property(note, 'Fret'),
			),
		).toEqual([48, 62, 76, 66]);
		expect(notes.map((note) => property(note, 'Midi'))).toEqual([
			48, 62, 76, 66,
		]);
		expect(
			notes[0]!
				.child('Properties')!
				.childrenNamed('Property')
				.map((p) => p.getAttribute('name'))
				.sort(),
		).toEqual(['ConcertPitch', 'Fret', 'Midi', 'String', 'TransposedPitch']);
	});

	it('keeps internal strings out of notation-only MusicXML', async () => {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const result = await parser.parseFromBytes(
			await serializer.serializeToBytes(document),
		);
		const restored = result.score.parts[0]!.measures[0]!;

		expect(restored.getStaffTunings()).toEqual([]);
		expect(restored.notes[0]).toMatchObject({
			string: null,
			fret: null,
			pitch: { step: 'C', octave: 4 },
		});
		expect(schemaErrors(result)).toEqual([]);
	});

	it('reads the scale verified in Guitar Pro 8 without inventing tablature', async () => {
		const result = await parser.parseFromBlob(
			Bun.file(
				new URL('./fixtures/guitar-pro/piano-native.gp', import.meta.url),
			),
		);
		const measures = result.score.parts[0]!.measures;

		expect(
			measures.flatMap((m) =>
				m.notes.map((n) => `${n.pitch?.step}${n.pitch?.octave}`),
			),
		).toEqual([
			'C3',
			'D3',
			'E3',
			'F3',
			'G3',
			'A3',
			'B3',
			'C4',
			'D4',
			'E4',
			'F4',
			'G4',
			'A4',
			'B4',
			'C5',
			'C4',
			'C4',
			'C4',
			'C4',
			'C3',
			'C4',
			'C5',
			'C4',
		]);
		expect(measures.flatMap((m) => m.getStaffTunings())).toEqual([]);
		expect(schemaErrors(result)).toEqual([]);
	});

	it('preserves the full MIDI pitch range with nonnegative internal frets', async () => {
		const voice = measure.getOrCreateVoice('1');
		voice.addNote({ step: 'C', octave: -1, type: 'half' });
		voice.addNote({ step: 'G', octave: 9, type: 'half' });
		const bytes = await serializer.serializeToBytes(document);
		const result = await parser.parseFromBytes(bytes);
		const root = await gpif(bytes);

		expect(
			result.score.parts[0]!.measures[0]!.notes.map((n) => [
				n.pitch?.step,
				n.pitch?.octave,
			]),
		).toEqual([
			['C', -1],
			['G', 9],
		]);
		expect(
			root
				.child('Notes')!
				.childrenNamed('Note')
				.map((n) => property(n, 'Fret')),
		).toEqual([0, 127]);
	});

	it('keeps every pitch of a tied upper-register chord', async () => {
		const pitches = [
			{ step: 'C', octave: 5 },
			{ step: 'E', octave: 5 },
			{ step: 'G', octave: 5 },
		] as const;
		const first = measure
			.getOrCreateVoice('1')
			.addChord([...pitches], { type: 'whole' });
		const second = part
			.addMeasure()
			.getOrCreateVoice('1')
			.addChord([...pitches], { type: 'whole' });
		first.notes[0]!.addTie(second.notes[0]!);
		first.notes[1]!.addTie(second.notes[1]!);
		first.notes[2]!.addTie(second.notes[2]!);
		const result = await parser.parseFromBytes(
			await serializer.serializeToBytes(document),
		);
		const measures = result.score.parts[0]!.measures;

		expect(measures.map((m) => m.notes.map((n) => n.pitch?.step))).toEqual([
			['C', 'E', 'G'],
			['C', 'E', 'G'],
		]);
		expect(
			measures[0]!.notes.map((n) => n.ties[0]?.partner?.note.pitch?.step),
		).toEqual(['C', 'E', 'G']);
		expect(schemaErrors(result)).toEqual([]);
	});

	it('reserves a tied pitch when the next chord has a new lower note', async () => {
		const start = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'whole' });
		const chord = part
			.addMeasure()
			.getOrCreateVoice('1')
			.addChord(
				[
					{ step: 'G', octave: 4 },
					{ step: 'C', octave: 5 },
				],
				{ type: 'whole' },
			);
		start.addTie(chord.notes[1]!);
		const result = await parser.parseFromBytes(
			await serializer.serializeToBytes(document),
		);
		const measures = result.score.parts[0]!.measures;

		expect(measures[1]!.notes.map((n) => n.pitch?.step)).toEqual(['G', 'C']);
		expect(measures[0]!.notes[0]!.ties[0]!.partner?.note).toBe(
			measures[1]!.notes[1],
		);
	});

	it('keeps piano staves and simultaneous voices separate', async () => {
		measure.setStaveCount(2);
		measure.setClef({ sign: 'F', line: 4, staff: '2' });
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'whole' });
		measure
			.getOrCreateVoice('2')
			.addNote({ step: 'E', octave: 4, type: 'whole' });
		measure
			.getOrCreateVoice('3', { staff: '2' })
			.addNote({ step: 'C', octave: 2, type: 'whole' });
		const result = await parser.parseFromBytes(
			await serializer.serializeToBytes(document),
		);
		const restored = result.score.parts[0]!.measures[0]!;

		expect(restored.staveCount).toBe(2);
		expect(
			restored.notes.map((n) => [n.staff, n.pitch?.step, n.pitch?.octave]),
		).toEqual([
			['1', 'C', 5],
			['1', 'E', 4],
			['2', 'C', 2],
		]);
		expect(restored.getStaffTunings('1')).toEqual([]);
		expect(restored.getStaffTunings('2')).toEqual([]);
		expect(schemaErrors(result)).toEqual([]);
	});
});

async function gpif(bytes: Uint8Array): Promise<MElement> {
	const zip = await JSZip.loadAsync(bytes);
	return new MDOMParser().parseFromString(
		await zip.file('Content/score.gpif')!.async('string'),
	).root;
}

function property(note: MElement, name: string): number {
	const p = note
		.child('Properties')!
		.childrenNamed('Property')
		.find((p) => p.getAttribute('name') === name)!;
	return Number(p.childrenNamed(name)[0]?.text ?? p.child('Number')?.text);
}
