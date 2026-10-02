import JSZip from 'jszip';

/** Limits on what reading a `.mxl` or `.gp` archive may cost. */
export interface ArchiveOptions {
	/**
	 * The most bytes the entries read from one archive may inflate to, in total,
	 * before parsing throws. Guards against zip bombs; raise it for unusually
	 * large scores. Defaults to {@link DEFAULT_MAX_UNCOMPRESSED_BYTES}.
	 */
	maxUncompressedBytes?: number;
}

/** 128 MiB: several times the largest real-world MusicXML scores. */
export const DEFAULT_MAX_UNCOMPRESSED_BYTES = 128 * 1024 * 1024;

/** The streaming reader JSZip ships but leaves out of its type declarations. */
interface EntryStream {
	on(event: 'data', listener: (chunk: Uint8Array) => void): EntryStream;
	on(event: 'end', listener: () => void): EntryStream;
	on(event: 'error', listener: (error: Error) => void): EntryStream;
	pause(): EntryStream;
	resume(): EntryStream;
}

/** Reads entries from a zip archive under a shared uncompressed-size budget. */
export class ArchiveReader {
	private remaining: number;

	private constructor(
		private readonly zip: JSZip,
		maxUncompressedBytes: number,
	) {
		this.remaining = maxUncompressedBytes;
	}

	static async load(
		data: Uint8Array | ArrayBuffer,
		opts: ArchiveOptions = {},
	): Promise<ArchiveReader> {
		return new ArchiveReader(
			await JSZip.loadAsync(data),
			opts.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES,
		);
	}

	/** An entry decoded as UTF-8, or null when the archive has no such entry. */
	async text(path: string): Promise<string | null> {
		const bytes = await this.bytes(path);
		return bytes && new TextDecoder().decode(bytes);
	}

	/** An entry's raw bytes, or null when the archive has no such entry. */
	async bytes(path: string): Promise<Uint8Array | null> {
		const file = this.zip.file(path);
		if (!file) {
			return null;
		}
		// Streamed rather than read with async(): the size in the zip header is
		// attacker-controlled, so the budget is enforced on what actually inflates.
		const stream = (
			file as unknown as { internalStream(type: 'uint8array'): EntryStream }
		).internalStream('uint8array');
		const chunks: Uint8Array[] = [];
		await new Promise<void>((resolve, reject) => {
			stream
				.on('data', (chunk) => {
					this.remaining -= chunk.length;
					if (this.remaining < 0) {
						stream.pause();
						reject(
							new Error(
								`mdom: archive inflates past maxUncompressedBytes while reading ${path}`,
							),
						);
						return;
					}
					chunks.push(chunk);
				})
				.on('end', resolve)
				.on('error', reject)
				.resume();
		});
		return concat(chunks);
	}
}

function concat(chunks: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(
		chunks.reduce((total, chunk) => total + chunk.length, 0),
	);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.length;
	}
	return out;
}
