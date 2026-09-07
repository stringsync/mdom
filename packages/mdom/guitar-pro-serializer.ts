import type { GuitarProOptions } from './guitar-pro-options';
import type { MDocument } from './m-document';

/** Exports core notation and tablature as a Guitar Pro 7/8 `.gp` archive. */
export class GuitarProSerializer {
	async serializeToBlob(
		document: MDocument,
		opts: GuitarProOptions = {},
	): Promise<Blob> {
		const bytes = await this.serializeToBytes(document, opts);
		return new Blob([bytes], { type: 'application/octet-stream' });
	}

	/** Throws when the document cannot be represented without changing its core musical data. */
	async serializeToBytes(
		document: MDocument,
		opts: GuitarProOptions = {},
	): Promise<Uint8Array<ArrayBuffer>> {
		const codec = await import('@coderline/alphatab');
		const { GuitarProScoreWriter } = await import('./guitar-pro-score-writer');
		const score = new GuitarProScoreWriter(codec, opts).write(document);
		return new Uint8Array(new codec.exporter.Gp7Exporter().export(score));
	}
}
