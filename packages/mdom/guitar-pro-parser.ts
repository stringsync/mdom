import { ArchiveReader } from './archive-reader';
import { GuitarProConfiguration } from './guitar-pro-configuration';
import { GuitarProDocumentReader } from './guitar-pro-document-reader';
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProXml } from './guitar-pro-xml';
import type { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';

/** Imports core notation and tablature from Guitar Pro 7/8 `.gp` archives. */
export class GuitarProParser {
	async parseFromBlob(
		blob: Blob,
		opts: GuitarProOptions = {},
	): Promise<MDocument> {
		return this.parseFromBytes(new Uint8Array(await blob.arrayBuffer()), opts);
	}

	/** Throws for malformed archives, older Guitar Pro formats, unsupported musical features, or archives that inflate past `opts.maxUncompressedBytes`. */
	async parseFromBytes(
		bytes: Uint8Array,
		opts: GuitarProOptions = {},
	): Promise<MDocument> {
		if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
			throw new Error(
				'Expected a Guitar Pro 7/8 .gp ZIP archive; .gp3, .gp4, .gp5 and .gpx are not supported',
			);
		}
		const archive = await ArchiveReader.load(bytes, opts);
		const gpif = await archive.text('Content/score.gpif');
		if (gpif === null) {
			throw new Error('Guitar Pro archive has no Content/score.gpif');
		}
		const root = new MDOMParser().parseFromString(gpif).root;
		const configuration = await archive.bytes('Content/PartConfiguration');
		const tablature = configuration
			? new GuitarProConfiguration().readTablature(configuration)
			: [];
		return new GuitarProDocumentReader(new GuitarProXml(root), opts).read(
			tablature,
		);
	}
}
