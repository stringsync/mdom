import { beforeEach, describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import type { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import type { Measure } from './measure';
import { schemaErrors } from './music-xml-schema';

describe('Guitar Pro tablature', () => {
	let document: MDocument;
	let measure: Measure;
	let parser: GuitarProParser;
	let serializer: GuitarProSerializer;

	beforeEach(() => {
		parser = new GuitarProParser();
		serializer = new GuitarProSerializer();
		document = new MDOMParser().parseFromString(`<score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>Two strings</part-name></score-part></part-list>
      <part id="P1"><measure number="1"><attributes>
        <divisions>256</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>TAB</sign><line>5</line></clef>
        <staff-details><staff-lines>2</staff-lines>
          <staff-tuning line="1"><tuning-step>G</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
          <staff-tuning line="2"><tuning-step>C</tuning-step><tuning-octave>4</tuning-octave></staff-tuning>
          <capo>2</capo>
        </staff-details>
      </attributes></measure></part></score-partwise>`);
		measure = document.score.parts[0]!.measures[0]!;
	});

	it('keeps open-string pitches with a capo and nonstandard tuning', async () => {
		const chord = measure.getOrCreateVoice('1').addChord(
			[
				{ step: 'D', octave: 4 },
				{ step: 'A', octave: 3 },
			],
			{ type: 'whole' },
		);
		chord.notes[0]!.setStringFret({ string: 1, fret: 0 });
		chord.notes[1]!.setStringFret({ string: 2, fret: 0 });
		const result = await parser.parseFromBlob(
			await serializer.serializeToBlob(document),
		);
		const restored = result.score.parts[0]!.measures[0]!;

		expect(restored.getStaffTunings().map((tuning) => tuning.midi)).toEqual([
			55, 60,
		]);
		expect(restored.getStaffDetails()?.capo).toBe(2);
		expect(
			restored.notes.map((note) => [
				note.string,
				note.fret,
				note.pitch?.step,
				note.pitch?.octave,
			]),
		).toEqual([
			[1, 0, 'D', 4],
			[2, 0, 'A', 3],
		]);
		expect(schemaErrors(result)).toEqual([]);
	});

	it('writes GPIF string indices and frets independently of the mdom reader', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'E', octave: 4, type: 'whole' });
		note.setStringFret({ string: 1, fret: 2 });
		const zip = await JSZip.loadAsync(
			await serializer.serializeToBytes(document),
		);
		const gpif = new MDOMParser().parseFromString(
			await zip.file('Content/score.gpif')!.async('string'),
		).root;
		const properties = gpif.child('Notes')!.child('Note')!.child('Properties')!;

		expect(
			properties
				.childrenNamed('Property')
				.find((property) => property.getAttribute('name') === 'String')
				?.child('String')?.text,
		).toBe('1');
		expect(
			properties
				.childrenNamed('Property')
				.find((property) => property.getAttribute('name') === 'Fret')
				?.child('Fret')?.text,
		).toBe('2');
	});

	it('rejects a fret that disagrees with the pitch', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'whole' });
		note.setStringFret({ string: 1, fret: 4 });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'pitch disagrees',
		);
	});

	it('rejects a string outside the tuning', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'whole' });
		note.setStringFret({ string: 3, fret: 0 });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'Invalid string',
		);
	});

	it('rejects a missing string assignment on a tablature staff', async () => {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'whole' });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'needs a string and fret',
		);
	});

	it('rejects string assignments without a tuning', async () => {
		measure.getStaffDetails()!.remove();
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'whole' });
		note.setStringFret({ string: 1, fret: 0 });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'requires tuning, string and fret',
		);
	});

	it('rejects a tuning with missing line numbers', async () => {
		measure.getStaffTunings()[0]!.setAttribute('line', '3');

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'tuning lines must be consecutive',
		);
	});

	it('rejects a capo change after the first measure', async () => {
		const next = document.score.parts[0]!.addMeasure();
		next.copySignaturesFrom(measure);
		next.getStaffDetails()!.child('capo')!.setText('3');

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'mid-score tuning or capo changes',
		);
	});
});
