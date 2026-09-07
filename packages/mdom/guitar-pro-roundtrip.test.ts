import { beforeEach, describe, expect, it } from 'bun:test';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import type { Measure } from './measure';
import { schemaErrors } from './music-xml-schema';

describe('Guitar Pro round trips', () => {
	let parser: GuitarProParser;
	let serializer: GuitarProSerializer;
	let document: MDocument;
	let measure: Measure;

	beforeEach(() => {
		parser = new GuitarProParser();
		serializer = new GuitarProSerializer();
		document = MDocument.empty();
		measure = document.score.addPart({ name: 'Piano' }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: 'G', line: 2 });
	});

	it('keeps separate voices aligned with rests filling explicit gaps', async () => {
		measure
			.getOrCreateVoice('high')
			.addNote({ step: 'C', octave: 5, type: 'half', onset: 2 });
		measure
			.getOrCreateVoice('low')
			.addNote({ step: 'C', octave: 3, type: 'whole' });
		const result = await parser.parseFromBytes(
			await serializer.serializeToBytes(document),
		);

		expect(
			result.score.parts[0]!.measures[0]!.notes.map((note) => [
				note.voice,
				note.measureBeat,
				note.beats,
				note.isRest,
			]),
		).toEqual([
			['1', 0, 2, true],
			['1', 2, 2, false],
			['2', 0, 4, false],
		]);
		expect(schemaErrors(result)).toEqual([]);
	});

	it('keeps treble and bass staves in one part', async () => {
		measure.setStaveCount(2);
		measure.setClef({ sign: 'F', line: 4, staff: '2' });
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'whole' });
		measure
			.getOrCreateVoice('2', { staff: '2' })
			.addNote({ step: 'C', octave: 3, type: 'whole' });
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);
		const restored = result.score.parts[0]!.measures[0]!;

		expect(result.score.parts).toHaveLength(1);
		expect(restored.staveCount).toBe(2);
		expect(restored.getClef('2')).toMatchObject({ sign: 'F', line: 4 });
		expect(
			restored.notes.map((note) => [
				note.staff,
				note.pitch?.octave,
				note.measureBeat,
			]),
		).toEqual([
			['1', 5, 0],
			['2', 3, 0],
		]);
		expect(schemaErrors(result)).toEqual([]);
	});

	it('keeps tied notes connected across measures', async () => {
		const first = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const next = document.score.parts[0]!.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		first.addTie(next);
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);
		const measures = result.score.parts[0]!.measures;

		expect(measures[0]!.notes[0]!.ties[0]!.partner?.note).toBe(
			measures[1]!.notes[0],
		);
		expect(measures[1]!.notes[0]!.ties[0]!.tieType).toBe('stop');
		expect(schemaErrors(result)).toEqual([]);
	});

	it('keeps grace notes off the measured timeline', async () => {
		const grace = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'eighth' });
		grace.convertToGrace();
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);
		const notes = result.score.parts[0]!.measures[0]!.notes;

		expect(
			notes.map((note) => [note.isGrace, note.duration, note.measureBeat]),
		).toEqual([
			[true, null, 0],
			[false, 1024, 0],
		]);
		expect(schemaErrors(result)).toEqual([]);
	});

	it('keeps tuplet timing through an independent fixture round trip', async () => {
		const source = await parser.parseFromBlob(
			Bun.file(new URL('./fixtures/guitar-pro/tuplets.gp', import.meta.url)),
		);
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(source),
		);

		expect(
			result.score.parts[0]!.measures[0]!.notes.map((note) => [
				note.measureBeat,
				note.beats,
			]),
		).toEqual([
			[0, 2 / 3],
			[2 / 3, 2 / 3],
			[4 / 3, 2 / 3],
			[2, 2],
		]);
		expect(schemaErrors(result)).toEqual([]);
	});

	it('keeps whole-measure rests in three-four time', async () => {
		const source =
			new MDOMParser().parseFromString(`<score-partwise><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
      <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><rest measure="yes"/><duration>3</duration></note></measure></part></score-partwise>`);
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(source),
		);

		expect(result.score.parts[0]!.measures[0]!.notes[0]).toMatchObject({
			isRest: true,
			beats: 3,
		});
		expect(schemaErrors(result)).toEqual([]);
	});

	it('keeps tempo, dynamics and simple articulations', async () => {
		measure.addDirection({
			tempo: 84,
			metronome: { beatUnit: 'quarter', perMinute: 84 },
			dynamics: 'p',
		});
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		note.addArticulation('staccato');
		note.addArticulation('accent');
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);
		const restored = result.score.parts[0]!.measures[0]!;

		expect(restored.sounds.map((sound) => sound.tempo)).toContain(84);
		expect(
			restored.directions.flatMap((direction) =>
				direction.dynamics.flatMap((dynamic) => dynamic.marks),
			),
		).toContain('p');
		expect(restored.notes[0]!.articulations).toEqual(['staccato', 'accent']);
	});

	it('does not retain tracks or notes between conversions', async () => {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const first = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);
		const second = MDocument.empty();
		second.score
			.addPart({ name: 'Solo' })
			.addMeasure()
			.getOrCreateVoice('1')
			.addRest({ type: 'whole' });
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(second),
		);

		expect(first.score.parts[0]!.measures[0]!.notes[0]!.pitch?.step).toBe('C');
		expect(result.score.parts.map((part) => part.label)).toEqual(['Solo']);
		expect(
			result.score.parts[0]!.measures[0]!.notes.map((note) => note.isRest),
		).toEqual([true]);
	});

	it('carries dynamics across notes and barlines', async () => {
		measure.addDirection({ dynamics: 'p' });
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'half' });
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'half' });
		document.score.parts[0]!.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'E', octave: 4, type: 'whole' });
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);

		expect(
			result.score.parts[0]!.measures.flatMap((bar) =>
				bar.directions.flatMap((direction) =>
					direction.dynamics.flatMap((mark) => mark.marks),
				),
			),
		).toEqual(['p', 'p', 'p']);
	});

	it('keeps text at its original beat without repeating it later', async () => {
		measure.addDirection({ words: 'With feeling' });
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'half' });
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'half' });
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);

		expect(
			result.score.parts[0]!.measures[0]!.directions.flatMap(
				(direction) => direction.words,
			),
		).toEqual(['With feeling']);
	});

	it('converts a dotted metronome beat to quarter-note tempo without a sound element', async () => {
		measure.addDirection({
			metronome: { beatUnit: 'quarter', dots: 1, perMinute: 80 },
		});
		measure.getOrCreateVoice('1').addRest({ type: 'whole' });
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);

		expect(
			result.score.parts[0]!.measures[0]!.sounds.map((sound) => sound.tempo),
		).toEqual([120]);
	});

	it('keeps a voice assigned to the same slot when another voice is silent', async () => {
		measure
			.getOrCreateVoice('upper')
			.addNote({ step: 'C', octave: 5, type: 'whole' });
		measure
			.getOrCreateVoice('lower')
			.addNote({ step: 'C', octave: 3, type: 'whole' });
		document.score.parts[0]!.addMeasure()
			.getOrCreateVoice('lower')
			.addNote({ step: 'D', octave: 3, type: 'whole' });
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);

		expect(
			result.score.parts[0]!.measures[1]!.notes.map((note) => [
				note.voice,
				note.isRest,
				note.measureBeat,
			]),
		).toEqual([
			['1', true, 0],
			['2', false, 0],
		]);
	});
});
