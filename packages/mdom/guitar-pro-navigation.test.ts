import { beforeEach, describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import type { MElement } from './m-node';
import type { Measure } from './measure';
import { schemaErrors } from './music-xml-schema';

describe('Guitar Pro endings and jumps', () => {
	let parser: GuitarProParser;
	let serializer: GuitarProSerializer;

	beforeEach(() => {
		parser = new GuitarProParser();
		serializer = new GuitarProSerializer();
	});

	it('imports alternate endings as volta brackets', async () => {
		const document = await fixture('repeat-close-alternate-endings.gp');

		expect(
			document.score.parts[0]!.measures.map((measure) =>
				measure.barlines.map((barline) => [
					barline.location,
					barline.ending?.type ?? null,
					barline.ending?.numbers ?? null,
					barline.repeat,
				]),
			),
		).toEqual([
			[['left', null, null, 'forward']],
			[
				['left', 'start', [1, 3], null],
				['right', 'stop', [1, 3], null],
			],
			[
				['left', 'start', [2], null],
				['right', 'discontinue', [2], null],
			],
			[['right', null, null, 'backward']],
			[],
		]);
		expect(schemaErrors(document)).toEqual([]);
	});

	it('imports targets at the bar start and jumps at its end', async () => {
		const document = await fixture('directions.gp');
		const marks = document.score.parts[0]!.measures.map((measure) =>
			navigationOf(measure),
		);

		expect(marks[0]).toEqual([
			['coda', 0, { coda: 'coda' }],
			['coda', 0, { coda: 'double-coda' }],
			['segno', 0, { segno: 'segno' }],
			['segno', 0, { segno: 'segno-segno' }],
			['Fine', 4, { fine: 'yes' }],
		]);
		expect(marks[1]).toEqual([
			['D.C.', 4, { dacapo: 'yes' }],
			['D.S.', 4, { dalsegno: 'segno' }],
			['D.S.S.', 4, { dalsegno: 'segno-segno' }],
			['To Coda', 4, { tocoda: 'coda' }],
			['To Double Coda', 4, { tocoda: 'double-coda' }],
		]);
		expect(marks[3]!.map(([text]) => text)).toEqual([
			'D.C. al Double Coda',
			'D.S. al Double Coda',
			'D.S.S. al Double Coda',
		]);
		expect(schemaErrors(document)).toEqual([]);
	});

	it('round-trips the fixtures', async () => {
		for (const name of ['repeat-close-alternate-endings.gp', 'directions.gp']) {
			const document = await fixture(name);
			const gpif = await gpifOf(document);
			const original = (
				await JSZip.loadAsync(
					await Bun.file(
						new URL(`./fixtures/guitar-pro/${name}`, import.meta.url),
					).arrayBuffer(),
				)
			)
				.file('Content/score.gpif')!
				.async('string');
			const source = new MDOMParser().parseFromString(await original).root;

			expect(masterNavigation(gpif)).toEqual(masterNavigation(source));
		}
	});

	it('exports endings and marks written through mdom', async () => {
		const document = MDocument.empty();
		const part = document.score.addPart({ name: 'Guitar' });
		const measures = [0, 1, 2, 3].map(() => {
			const measure = part.addMeasure();
			measure.setTime({ beats: 4, beatType: 4 });
			return measure;
		});
		measures[0]!.addNavigation({ kind: 'segno', id: 'A' });
		measures[1]!.addEnding({ type: 'start', number: [1, 2] });
		for (const measure of measures) {
			measure
				.getOrCreateVoice('1')
				.addNote({ step: 'C', octave: 4, type: 'whole' });
		}
		measures[1]!.addNavigation({ kind: 'to-coda', id: 'B' });
		measures[1]!.addBarline({
			location: 'right',
			repeat: { direction: 'backward', times: 3 },
		});
		measures[1]!.addEnding({ type: 'stop', number: [1, 2] });
		measures[2]!.addEnding({ type: 'start', number: [3] });
		measures[2]!.addNavigation({
			kind: 'dal-segno',
			id: 'A',
			until: 'coda',
		});
		measures[2]!.addEnding({ type: 'discontinue', number: [3] });
		measures[3]!.addNavigation({ kind: 'coda', id: 'B' });

		const gpif = await gpifOf(document);

		expect(masterNavigation(gpif)).toEqual([
			[null, ['Segno'], []],
			['1 2', [], ['DaCoda']],
			['3', [], ['DaSegnoAlCoda']],
			[null, ['Coda'], []],
		]);
		expect(gpif.child('Beats')!.toString()).not.toContain('FreeText');
	});

	it('names the features it still omits one by one', async () => {
		const omitted: string[] = [];
		await parser.parseFromBlob(
			Bun.file(new URL('./fixtures/guitar-pro/fermata.gp', import.meta.url)),
			{
				unsupported: 'omit',
				onUnsupported: (feature) => omitted.push(feature),
			},
		);

		expect(omitted).toContain('fermatas');
		expect(omitted.join()).not.toContain('jumps');
	});

	async function fixture(name: string): Promise<MDocument> {
		return parser.parseFromBlob(
			Bun.file(new URL(`./fixtures/guitar-pro/${name}`, import.meta.url)),
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

/** Each navigation direction's printed text or sign, onset and `<sound>` attributes. */
function navigationOf(
	measure: Measure,
): Array<[string, number | null, Record<string, string>]> {
	return measure.directions
		.filter((direction) => direction.sound && direction.sound.tempo == null)
		.map((direction) => [
			direction.words.join('') || direction.navigations.join(''),
			direction.measureBeat,
			{ ...direction.sound!.attributes },
		]);
}

/** Each GPIF MasterBar's AlternateEndings, Directions targets and jumps. */
function masterNavigation(
	gpif: MElement,
): Array<[string | null, string[], string[]]> {
	return gpif
		.child('MasterBars')!
		.childrenNamed('MasterBar')
		.map((master) => [
			master.child('AlternateEndings')?.text?.trim() ?? null,
			(master.child('Directions')?.childrenNamed('Target') ?? []).map((node) =>
				node.text!.trim(),
			),
			(master.child('Directions')?.childrenNamed('Jump') ?? []).map((node) =>
				node.text!.trim(),
			),
		]);
}
