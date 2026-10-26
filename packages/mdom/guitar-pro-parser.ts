import { ArchiveReader } from './archive-reader';
import { GuitarProBinaryReader } from './guitar-pro-binary-reader';
import { GuitarProConfiguration } from './guitar-pro-configuration';
import { GuitarProDocumentReader } from './guitar-pro-document-reader';
import { GpxFileSystem, isGpx } from './guitar-pro-gpx-file-system';
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProXml } from './guitar-pro-xml';
import type { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';

/** Imports core notation and tablature from Guitar Pro 7/8 `.gp` archives and Guitar Pro 6 `.gpx` containers, and Guitar Pro 5 `.gp5` files. */
export class GuitarProParser {
	async parseFromBlob(
		blob: Blob,
		opts: GuitarProOptions = {},
	): Promise<MDocument> {
		return this.parseFromBytes(new Uint8Array(await blob.arrayBuffer()), opts);
	}

	/** Throws for malformed archives, Guitar Pro 4 and older, unsupported musical features, or archives that inflate past `opts.maxUncompressedBytes`. */
	async parseFromBytes(
		bytes: Uint8Array,
		opts: GuitarProOptions = {},
	): Promise<MDocument> {
		if (isGpx(bytes)) {
			return this.readGpif(
				GpxFileSystem.load(bytes, opts).text('score.gpif'),
				null,
				opts,
			);
		}
		if (GuitarProBinaryReader.isGuitarPro(bytes)) {
			const score = new GuitarProBinaryReader(opts).read(bytes);
			return this.readGpif(score.gpif, null, opts, score.tablature);
		}
		if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
			throw new Error(
				'Expected a Guitar Pro 6 .gpx container or a 7/8 .gp ZIP archive, or a Guitar Pro 5 .gp5 file; .gp3 and .gp4 are not supported',
			);
		}
		const archive = await ArchiveReader.load(bytes, opts);
		const gpif = await archive.text('Content/score.gpif');
		if (gpif === null) {
			throw new Error('Guitar Pro archive has no Content/score.gpif');
		}
		return this.readGpif(
			gpif,
			await archive.bytes('Content/PartConfiguration'),
			opts,
		);
	}

	private readGpif(
		gpif: string | null,
		configuration: Uint8Array | null,
		opts: GuitarProOptions,
		tablatureOverride?: boolean[],
	): MDocument {
		if (gpif === null) {
			throw new Error('Guitar Pro 6 container has no score.gpif');
		}
		const root = new MDOMParser().parseFromString(gpif).root;
		const tablature =
			tablatureOverride ??
			(configuration
				? new GuitarProConfiguration().readTablature(configuration)
				: []);
		return new GuitarProDocumentReader(new GuitarProXml(root), opts).read(
			tablature,
		);
	}
}
