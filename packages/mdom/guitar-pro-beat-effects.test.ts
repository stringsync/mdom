import { describe, expect, it } from 'bun:test';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import type { Measure } from './measure';
import { schemaErrors } from './music-xml-schema';

const fixture = async (name: string, lost: string[] = []) =>
	new GuitarProParser().parseFromBlob(
		Bun.file(new URL(`./fixtures/guitar-pro/${name}`, import.meta.url)),
		{ unsupported: 'omit', onUnsupported: (feature) => lost.push(feature) },
	);

const leads = (measure: Measure) =>
	measure.notes.filter((note) => !note.isChordMember);

const roundTrip = async (document: MDocument) =>
	new GuitarProParser().parseFromBytes(
		await new GuitarProSerializer().serializeToBytes(document),
	);

describe('Guitar Pro beat effects', () => {
	it('reads brushes as arpeggiate rolls and pick strokes as bowings', async () => {
		const document = await fixture('strokes.gp');
		const measure = document.score.parts[0]!.measures[0]!;
		expect(
			measure.notes.map((note) => note.arpeggiate?.direction ?? null),
		).toEqual([
			'up',
			'up',
			'up',
			'up',
			'down',
			'down',
			'down',
			'down',
			null,
			null,
		]);
		expect(leads(measure).map((note) => note.bowing)).toEqual([
			null,
			null,
			'up',
			'down',
		]);
		expect(schemaErrors(document)).toEqual([]);
	});

	it('reads MasterBar fermatas onto the beats at their offsets', async () => {
		const lost: string[] = [];
		const document = await fixture('fermata.gp', lost);
		const [short, medium, long] = document.score.parts[0]!.measures;
		expect(leads(short!).map((note) => note.fermataShape)).toEqual(
			Array(4).fill('angled'),
		);
		expect(leads(medium!).map((note) => note.fermataShape)).toEqual(
			Array(4).fill('normal'),
		);
		expect(leads(long!).map((note) => note.fermataShape)).toEqual(
			Array(4).fill('square'),
		);
		// Offsets that fall between beats have no note to mark.
		expect(lost).toContain('fermatas between beats');
	});

	it('spans runs of beat ottavas, numbering overlaps apart', async () => {
		const document = await fixture('ottavia.gp');
		const measures = document.score.parts[0]!.measures;
		const shifts = (index: number) =>
			measures[index]!.directions.flatMap((direction) =>
				direction.octaveShifts.map((shift) => [
					direction.measureBeat,
					shift.ottava ?? shift.octaveShiftType,
					shift.number,
				]),
			);
		expect(shifts(4)).toEqual([
			[0, '8va', '1'],
			[1, 'stop', '1'],
			[1, '8vb', '2'],
			[2, 'stop', '2'],
			[2, '15ma', '1'],
			[3, 'stop', '1'],
			[3, '15mb', '2'],
			[4, 'stop', '2'],
		]);
		// A whole bar of 8va beats is one span.
		expect(shifts(5)).toEqual([
			[0, '8va', '1'],
			[4, 'stop', '1'],
		]);
		expect(schemaErrors(document)).toEqual([]);
	});

	it('reads tremolo picking speeds as tremolo marks', async () => {
		const document = await fixture('effects.gp');
		expect(
			leads(document.score.parts[0]!.measures[16]!).map(
				(note) =>
					note.ornaments.find((ornament) => ornament.tag === 'tremolo')
						?.tremoloMarks ?? null,
			),
		).toEqual([null, 3, 2, 1]);
	});

	it('round trips the beat effects of the fixtures', async () => {
		for (const name of [
			'strokes.gp',
			'fermata.gp',
			'ottavia.gp',
			'effects.gp',
		]) {
			const document = await fixture(name);
			const effects = (doc: MDocument) =>
				doc.score.parts[0]!.measures.map((measure) => [
					measure.notes.map((note) => [
						note.fermataShape,
						note.arpeggiate?.direction,
						note.bowing,
						note.tap,
						note.ornaments.map((ornament) => ornament.tremoloMarks),
					]),
					measure.directions.flatMap((direction) =>
						direction.octaveShifts.map((shift) => [
							direction.measureBeat,
							shift.ottava,
						]),
					),
				]);
			const again = await new GuitarProParser().parseFromBytes(
				await new GuitarProSerializer().serializeToBytes(document, {
					unsupported: 'omit',
				}),
				{ unsupported: 'omit' },
			);
			expect(effects(again)).toEqual(effects(document));
		}
	});

	it('writes MusicXML beat marks to Guitar Pro and back', async () => {
		const document = MDocument.empty();
		const part = document.score.addPart({ name: 'Guitar' });
		const first = part.addMeasure();
		first.setTime({ beats: 4, beatType: 4 });
		first.setClef({ sign: 'G', line: 2 });
		const voice = first.getOrCreateVoice('1');
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'quarter' },
		);
		for (const note of chord.notes) {
			note.setArpeggiate({ direction: 'down' });
		}
		chord.lead.setFermata('inverted', 'square');
		const picked = voice.addNote({ step: 'D', octave: 4, type: 'eighth' });
		picked.setBowing('up');
		picked.setTremolo(2);
		const tapped = voice.addNote({ step: 'E', octave: 4, type: 'eighth' });
		tapped.setTap({ hand: 'right' });
		tapped.setFermata('upright');
		const high = voice.addNote({ step: 'C', octave: 6, type: 'half' });
		const second = part.addMeasure();
		const last = second
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 6, type: 'whole' });
		high.addOctaveShift(last, '15ma');

		const result = await roundTrip(document);
		const [one, two] = result.score.parts[0]!.measures;
		const notes = one!.notes;
		expect(notes.map((note) => note.arpeggiate?.direction ?? null)).toEqual([
			'down',
			'down',
			null,
			null,
			null,
		]);
		expect(notes[0]!.fermataShape).toBe('square');
		expect(notes[2]!.bowing).toBe('up');
		expect(
			notes[2]!.ornaments.find((ornament) => ornament.tag === 'tremolo')
				?.tremoloMarks,
		).toBe(2);
		expect(notes[3]!.tap).toEqual({ hand: 'right' });
		expect(notes[3]!.fermataShape).toBe('normal');
		expect(
			[one!, two!].flatMap((measure) =>
				measure.directions.flatMap((direction) =>
					direction.octaveShifts.map((shift) => [
						measure.index,
						direction.measureBeat,
						shift.ottava ?? shift.octaveShiftType,
					]),
				),
			),
		).toEqual([
			[0, 2, '15ma'],
			[1, 4, 'stop'],
		]);
		expect(schemaErrors(result)).toEqual([]);
	});

	it('keeps rejecting what Guitar Pro beats cannot carry', async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: 'Guitar' }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		note.setTap({ hand: 'left' });
		await expect(
			new GuitarProSerializer().serializeToBytes(document),
		).rejects.toThrow('left-hand tapping');
		note.setTap(null);
		note.setTremolo(5);
		await expect(
			new GuitarProSerializer().serializeToBytes(document),
		).rejects.toThrow('tremolo of 5 marks');
	});
});
