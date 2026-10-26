import { beforeEach, describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import type { MElement } from './m-node';
import type { Measure } from './measure';
import { schemaErrors } from './music-xml-schema';

describe('Guitar Pro triplet feel', () => {
	let parser: GuitarProParser;
	let serializer: GuitarProSerializer;

	beforeEach(() => {
		parser = new GuitarProParser();
		serializer = new GuitarProSerializer();
	});

	it('imports each change of feel as a swing sound', async () => {
		const document = await withFeels([
			'Triplet8th',
			'Triplet8th',
			'Dotted16th',
			null,
			'Scottish8th',
			'NoTripletFeel',
		]);

		expect(swingsOf(document)).toEqual([
			[{ first: 2, second: 1, unit: 0.5 }],
			[],
			[{ first: 3, second: 1, unit: 0.25 }],
			[{ first: 1, second: 1, unit: 0.5 }],
			[{ first: 1, second: 3, unit: 0.5 }],
			[{ first: 1, second: 1, unit: 0.5 }],
		]);
		expect(schemaErrors(document)).toEqual([]);
	});

	it('writes nothing for a score that never swings', async () => {
		const document = await withFeels([
			null,
			'NoTripletFeel',
			null,
			null,
			null,
			null,
		]);

		expect(swingsOf(document).flat()).toEqual([]);
	});

	it('round-trips the feel of every bar', async () => {
		const feels = [
			'Triplet16th',
			'Triplet16th',
			null,
			'Dotted8th',
			'Scottish16th',
			null,
		];
		const gpif = await gpifOf(await withFeels(feels));

		expect(feelsOf(gpif)).toEqual(feels);
	});

	it('carries a swing written through mdom until a straight sound', async () => {
		const document = MDocument.empty();
		const part = document.score.addPart({ name: 'Guitar' });
		const measures = [0, 1, 2, 3].map(() => {
			const measure = part.addMeasure();
			measure.setTime({ beats: 4, beatType: 4 });
			return measure;
		});
		measures[0]!.addSound({ swing: { first: 2, second: 1 } });
		measures[2]!.addDirection({
			words: 'Straight',
			sound: { swing: { first: 1, second: 1 } },
		});
		measures[3]!.addSound({ swing: { first: 6, second: 2, unit: 0.25 } });
		for (const measure of measures) {
			measure
				.getOrCreateVoice('1')
				.addNote({ step: 'C', octave: 4, type: 'whole' });
		}

		expect(feelsOf(await gpifOf(document))).toEqual([
			'Triplet8th',
			'Triplet8th',
			null,
			'Dotted16th',
		]);
	});

	it('reports swing Guitar Pro cannot play', async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: 'Guitar' }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		const voice = measure.getOrCreateVoice('1');
		voice.addNote({ step: 'C', octave: 4, type: 'half' });
		measure.addSound({ swing: { first: 5, second: 3 } });
		voice.addNote({ step: 'C', octave: 4, type: 'half' });
		const omitted: string[] = [];

		await serializer.serializeToBlob(document, {
			unsupported: 'omit',
			onUnsupported: (feature) => omitted.push(feature),
		});

		expect(omitted).toEqual([
			'mid-measure swing changes',
			'swing 5:3 on a 0.5-beat unit',
		]);
		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'mid-measure swing',
		);
	});

	/** The six-bar time-signatures fixture with each bar's `TripletFeel` set (null leaves it out). */
	async function withFeels(feels: Array<string | null>): Promise<MDocument> {
		const zip = await JSZip.loadAsync(
			await Bun.file(
				new URL('./fixtures/guitar-pro/time-signatures.gp', import.meta.url),
			).arrayBuffer(),
		);
		const gpif = await zip.file('Content/score.gpif')!.async('string');
		let index = 0;
		zip.file(
			'Content/score.gpif',
			gpif.replace(/<MasterBar>/g, (tag) => {
				const feel = feels[index++];
				return feel ? `${tag}<TripletFeel>${feel}</TripletFeel>` : tag;
			}),
		);
		expect(index).toBe(feels.length);
		return parser.parseFromBlob(
			new Blob([await zip.generateAsync({ type: 'arraybuffer' })]),
		);
	}

	async function gpifOf(document: MDocument): Promise<MElement> {
		const zip = await JSZip.loadAsync(
			await (await serializer.serializeToBlob(document)).arrayBuffer(),
		);
		return new MDOMParser().parseFromString(
			await zip.file('Content/score.gpif')!.async('string'),
		).root;
	}
});

function swingsOf(document: MDocument): Array<Array<unknown>> {
	return document.score.parts[0]!.measures.map((measure: Measure) =>
		measure.sounds.flatMap((sound) => (sound.swing ? [sound.swing] : [])),
	);
}

function feelsOf(gpif: MElement): Array<string | null> {
	return gpif
		.child('MasterBars')!
		.childrenNamed('MasterBar')
		.map((master) => master.child('TripletFeel')?.text ?? null);
}
