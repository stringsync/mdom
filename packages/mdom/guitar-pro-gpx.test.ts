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

describe('Guitar Pro 6 .gpx import', () => {
	// alphaTab's guitarpro6 corpus holds the same scores as its guitarpro7 corpus.
	for (const name of [
		'key-signatures',
		'repeat-close',
		'score-info',
		'strings',
		'time-signatures',
		'tuplets',
	]) {
		it(`reads ${name}.gpx as the same score as ${name}.gp`, async () => {
			expect(await musicXml(`${name}.gpx`)).toBe(await musicXml(`${name}.gp`));
		});
	}

	it('reads notes.gpx', async () => {
		const xml = await musicXml('notes.gpx');
		expect(xml).toContain('<score-partwise');
		expect(xml).toContain('<note');
	});

	it('reads the grace-note slide in grace.gpx', async () => {
		const xml = await musicXml('grace.gpx');
		expect(xml).toContain('<grace');
		expect(xml).toContain('<slide type="start"');
	});

	it('throws once a container inflates past maxUncompressedBytes', async () => {
		await expect(
			new GuitarProParser().parseFromBytes(await fixture('notes.gpx'), {
				maxUncompressedBytes: 1024,
			}),
		).rejects.toThrow('maxUncompressedBytes');
	});

	it('rejects a container with no score.gpif', async () => {
		const bytes = new Uint8Array(0x2000);
		bytes.set(new TextEncoder().encode('BCFS'));
		await expect(new GuitarProParser().parseFromBytes(bytes)).rejects.toThrow(
			'score.gpif',
		);
	});
});
