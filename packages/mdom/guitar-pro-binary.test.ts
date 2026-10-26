import { describe, expect, it } from 'bun:test';
import { GuitarProBinaryReader } from './guitar-pro-binary-reader';
import { GuitarProParser, MusicXMLSerializer } from './index';

const fixture = (name: string) =>
	Bun.file(new URL(`./fixtures/guitar-pro/${name}`, import.meta.url))
		.arrayBuffer()
		.then((buffer) => new Uint8Array(buffer));

const musicXml = async (name: string, opts = {}) =>
	new MusicXMLSerializer().serializeToString(
		await new GuitarProParser().parseFromBytes(await fixture(name), opts),
	);

const versionHeader = (version: string) => {
	const header = new Uint8Array(31);
	header[0] = version.length;
	header.set(new TextEncoder().encode(version), 1);
	return header;
};

describe('Guitar Pro 5 .gp5 import', () => {
	// alphaTab's guitarpro5 corpus holds the same scores as its guitarpro7 corpus.
	for (const name of [
		'key-signatures',
		'notes',
		'repeat-close',
		'strings',
		'tuplets',
	]) {
		it(`reads ${name}.gp5 as the same score as ${name}.gp`, async () => {
			expect(await musicXml(`${name}.gp5`)).toBe(await musicXml(`${name}.gp`));
		});
	}

	it('reads the meters of time-signatures.gp5', async () => {
		const meters = (xml: string) =>
			xml.match(/<beats>\d+<\/beats>\s*<beat-type>\d+<\/beat-type>/g);

		expect(meters(await musicXml('time-signatures.gp5'))).toEqual(
			meters(await musicXml('time-signatures.gp')),
		);
	});

	it('reads the score information of score-info.gp5', async () => {
		const xml = await musicXml('score-info.gp5');
		const expected = await musicXml('score-info.gp');

		expect(xml).toContain('<movement-title>');
		expect(xml.match(/<creator[^>]*>[^<]*<\/creator>/g)).toEqual(
			expected.match(/<creator[^>]*>[^<]*<\/creator>/g),
		);
	});

	it('reads the lyric lines of score-info.gp5 with their start bars', async () => {
		const { gpif } = new GuitarProBinaryReader().read(
			await fixture('score-info.gp5'),
		);

		expect(
			[...gpif.matchAll(/<Text>([^<]*)<\/Text><Offset>(\d+)<\/Offset>/g)].map(
				([, text, offset]) => [text, offset],
			),
		).toEqual([
			['Line1', '0'],
			['Line2', '1'],
			['Line3', '2'],
			['Line4', '3'],
			['Line5', '4'],
		]);
	});

	it('reads grace notes with their effects as the GP7 score does', async () => {
		expect(await musicXml('grace.gp5')).toBe(await musicXml('grace.gp'));
	});

	// GP5 and its GP7 re-save differ only in a bar's trailing rest and its default dynamic.
	for (const name of [
		'bends',
		'dead',
		'hammer',
		'slides',
		'strokes',
		'tremolo',
		'vibrato',
	]) {
		it(`reads ${name}.gp5 as the same score as ${name}.gp`, async () => {
			expect(await musicXml(`${name}.gp5`, { unsupported: 'omit' })).toBe(
				await musicXml(`${name}.gp`, { unsupported: 'omit' }),
			);
		});
	}

	/** The `pattern` matches of both scores, in order. */
	const marks = async (name: string, pattern: RegExp) => {
		const found = async (file: string) =>
			(await musicXml(file, { unsupported: 'omit' })).match(pattern) ?? [];

		return { gp5: await found(`${name}.gp5`), gp7: await found(`${name}.gp`) };
	};

	it('reads the harmonics of harmonics.gp5', async () => {
		const { gp5, gp7 } = await marks(
			'harmonics',
			/<harmonic>.*?<\/harmonic>/gs,
		);

		expect(gp5.length).toBeGreaterThan(0);
		expect(gp5).toEqual(gp7);
	});

	it('reads the chord diagrams of chords.gp5', async () => {
		const { gp5, gp7 } = await marks('chords', /<harmony.*?<\/harmony>/gs);

		expect(gp5.length).toBe(8);
		expect(gp5).toEqual(gp7);
	});

	it('reads the alternate endings and repeats of repeat-close-alternate-endings.gp5', async () => {
		const { gp5, gp7 } = await marks(
			'repeat-close-alternate-endings',
			/<barline.*?<\/barline>/gs,
		);

		expect(gp5.join()).toContain('<ending');
		expect(gp5).toEqual(gp7);
	});

	it('reads the jumps and landmarks of directions.gp5', async () => {
		const { gp5, gp7 } = await marks(
			'directions',
			/<(?:segno|coda|sound)[^>]*>|<words[^>]*>[^<]*<\/words>/g,
		);

		expect(gp5.length).toBeGreaterThan(10);
		expect(gp5.toSorted()).toEqual(gp7.toSorted());
	});

	it('reads the ottavas of ottavia.gp5', async () => {
		const { gp5, gp7 } = await marks('ottavia', /<octave-shift[^>]*>/g);

		expect(gp5.length).toBe(8);
		expect(gp7.slice(0, 8)).toEqual(gp5);
	});

	it('reads the beat effects of effects.gp5', async () => {
		const xml = await musicXml('effects.gp5', { unsupported: 'omit' });

		expect(xml).toContain('<tremolo type="single">');
		expect(xml).toContain('<tap hand="right"/>');
		expect(xml).toContain('<arpeggiate');
		expect(xml).toContain('<wavy-line');
		expect(xml).toContain('<bend-alter>');
	});

	it('reads the tempo changes of effects.gp5 as the GP7 score does', async () => {
		const { gp5, gp7 } = await marks('effects', /<sound tempo="[^"]*"\/>/g);

		expect(gp5.length).toBeGreaterThan(0);
		expect(gp5).toEqual(gp7);
	});

	it('applies the unsupported option to effects with no MusicXML equivalent', async () => {
		await expect(musicXml('harmonics.gp5')).rejects.toThrow('Semi harmonics');
		expect(await musicXml('harmonics.gp5', { unsupported: 'omit' })).toContain(
			'<harmonic>',
		);
	});

	it('rejects Guitar Pro 4 files by version', async () => {
		await expect(
			new GuitarProParser().parseFromBytes(
				versionHeader('FICHIER GUITAR PRO v4.06'),
			),
		).rejects.toThrow('4.06 files are not supported');
	});

	it('throws a clear error for a truncated file', async () => {
		const bytes = await fixture('notes.gp5');

		await expect(
			new GuitarProParser().parseFromBytes(bytes.subarray(0, 400)),
		).rejects.toThrow('ends unexpectedly');
	});
});
