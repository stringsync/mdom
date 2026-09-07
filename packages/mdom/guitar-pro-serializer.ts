import JSZip from 'jszip';
import { GuitarProConfiguration } from './guitar-pro-configuration';
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProScoreWriter } from './guitar-pro-score-writer';
import type { MDocument } from './m-document';
import { MusicXMLSerializer } from './music-xml-serializer';

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
		const gpif = new GuitarProScoreWriter(opts).write(document);
		const configuration = new GuitarProConfiguration().write(document);
		const zip = new JSZip();
		zip.file('VERSION', '7.0');
		zip.file(
			'Content/score.gpif',
			new MusicXMLSerializer().serializeToString(gpif),
		);
		zip.file('Content/BinaryStylesheet', new Uint8Array(4));
		zip.file('Content/PartConfiguration', configuration.part);
		zip.file('Content/LayoutConfiguration', configuration.layout);
		return new Uint8Array(
			await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }),
		);
	}
}
