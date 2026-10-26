import { describe, expect, it } from 'bun:test';
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

	it('reads the score information of score-info.gp5 once lyrics are omitted', async () => {
		const xml = await musicXml('score-info.gp5', { unsupported: 'omit' });
		const expected = await musicXml('score-info.gp', { unsupported: 'omit' });

		expect(xml).toContain('<movement-title>');
		expect(xml.match(/<creator[^>]*>[^<]*<\/creator>/g)).toEqual(
			expected.match(/<creator[^>]*>[^<]*<\/creator>/g),
		);
	});

	it('rejects lyrics by default', async () => {
		await expect(musicXml('score-info.gp5')).rejects.toThrow('lyrics');
	});

	it('applies the unsupported option to grace note effects', async () => {
		await expect(musicXml('grace.gp5')).rejects.toThrow('note techniques');
		expect(await musicXml('grace.gp5', { unsupported: 'omit' })).toContain(
			'<grace',
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
