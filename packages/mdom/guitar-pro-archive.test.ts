import { beforeEach, describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import {
	GuitarProParser,
	GuitarProSerializer,
	MDOMParser,
	MDocument,
} from './index';

describe('Guitar Pro archives', () => {
	let parser: GuitarProParser;
	let serializer: GuitarProSerializer;

	beforeEach(() => {
		parser = new GuitarProParser();
		serializer = new GuitarProSerializer();
	});

	it('rejects legacy binary formats with an actionable error', async () => {
		await expect(
			parser.parseFromBytes(
				new TextEncoder().encode('FICHIER GUITAR PRO v5.10'),
			),
		).rejects.toThrow('.gp3, .gp4, .gp5 and .gpx are not supported');
	});

	it('rejects an unrelated ZIP archive', async () => {
		const zip = new JSZip();
		zip.file('score.musicxml', '<score-partwise/>');

		await expect(
			parser.parseFromBytes(await zip.generateAsync({ type: 'uint8array' })),
		).rejects.toThrow('Content/score.gpif');
	});

	it('rejects a truncated ZIP archive', async () => {
		await expect(
			parser.parseFromBytes(new Uint8Array([0x50, 0x4b, 3, 4])),
		).rejects.toThrow();
	});

	it('rejects malformed GPIF', async () => {
		const zip = new JSZip();
		zip.file('Content/score.gpif', '<GPIF><broken');

		await expect(
			parser.parseFromBytes(await zip.generateAsync({ type: 'uint8array' })),
		).rejects.toThrow();
	});

	it('packages a score with version and layout entries', async () => {
		const document = MDocument.empty();
		document.score
			.addPart()
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const blob = await serializer.serializeToBlob(document);
		const zip = await JSZip.loadAsync(await blob.arrayBuffer());

		expect(blob.type).toBe('application/octet-stream');
		expect(Object.keys(zip.files)).toEqual(
			expect.arrayContaining([
				'VERSION',
				'Content/score.gpif',
				'Content/BinaryStylesheet',
				'Content/PartConfiguration',
				'Content/LayoutConfiguration',
			]),
		);
		expect(await zip.file('VERSION')!.async('string')).toBe('7.0');
		expect(
			new MDOMParser().parseFromString(
				await zip.file('Content/score.gpif')!.async('string'),
			).root.tag,
		).toBe('GPIF');
	});

	it('rejects a document without music', async () => {
		await expect(serializer.serializeToBlob(MDocument.empty())).rejects.toThrow(
			'at least one part with measures',
		);
	});
});
