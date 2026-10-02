import { describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { GuitarProParser } from './guitar-pro-parser';
import { MDOMParser } from './m-dom-parser';

describe('archive size limits', () => {
	const mxl = async (score: string): Promise<Blob> => {
		const zip = new JSZip();
		zip.file(
			'META-INF/container.xml',
			'<container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>',
		);
		zip.file('score.musicxml', score);
		return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
	};

	it('parses an .mxl archive within the default limit', async () => {
		const doc = await new MDOMParser().parseFromBlob(
			await mxl('<score-partwise/>'),
		);

		expect(doc.root.tag).toBe('score-partwise');
	});

	it('rejects an .mxl archive that inflates past maxUncompressedBytes', async () => {
		const blob = await mxl(
			`<score-partwise>${' '.repeat(1_000_000)}</score-partwise>`,
		);

		await expect(
			new MDOMParser().parseFromBlob(blob, { maxUncompressedBytes: 100_000 }),
		).rejects.toThrow('inflates past maxUncompressedBytes');
	});

	it('counts every entry read against one budget', async () => {
		// The container and the score each fit in 350 bytes; together they do not.
		const blob = await mxl(
			`<score-partwise>${' '.repeat(250)}</score-partwise>`,
		);

		await expect(
			new MDOMParser().parseFromBlob(blob, { maxUncompressedBytes: 350 }),
		).rejects.toThrow('while reading score.musicxml');
	});

	it('rejects a Guitar Pro archive that inflates past maxUncompressedBytes', async () => {
		const fixture = Bun.file(
			new URL('./fixtures/guitar-pro/notes.gp', import.meta.url),
		);

		await expect(
			new GuitarProParser().parseFromBlob(fixture, {
				maxUncompressedBytes: 1_000,
			}),
		).rejects.toThrow('inflates past maxUncompressedBytes');
	});
});
