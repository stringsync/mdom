import {
	type ArchiveOptions,
	DEFAULT_MAX_UNCOMPRESSED_BYTES,
} from "./archive-reader";
import { BitReader } from "./guitar-pro-bit-reader";
import { TruncatedError } from "./guitar-pro-truncated-error";

const SECTOR_SIZE = 0x1000;
const BCFS = "BCFS";
const BCFZ = "BCFZ";

/** Whether the bytes start with a Guitar Pro 6 `.gpx` container header. */
export function isGpx(bytes: Uint8Array): boolean {
	const header = readString(bytes, 0, 4);
	return header === BCFS || header === BCFZ;
}

/** Reads the files inside a Guitar Pro 6 `.gpx` BCFZ/BCFS container. */
export class GpxFileSystem {
	private constructor(private readonly files: Map<string, Uint8Array>) {}

	/** Throws for malformed containers or ones that inflate past `opts.maxUncompressedBytes`. */
	static load(bytes: Uint8Array, opts: ArchiveOptions = {}): GpxFileSystem {
		const limit = opts.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES;
		const header = readString(bytes, 0, 4);
		let blocks: Uint8Array;
		if (header === BCFZ) {
			blocks = decompress(bytes, 4, limit);
		} else if (header === BCFS) {
			if (bytes.length > limit) {
				throw inflateError();
			}
			blocks = bytes.subarray(4);
		} else {
			throw new Error("Expected a Guitar Pro 6 .gpx container");
		}
		return new GpxFileSystem(readFiles(blocks, limit));
	}

	/** A file's bytes, or null when the container has no such file. */
	bytes(path: string): Uint8Array | null {
		return this.files.get(path) ?? null;
	}

	/** A file decoded as UTF-8, or null when the container has no such file. */
	text(path: string): string | null {
		const bytes = this.bytes(path);
		return bytes && new TextDecoder().decode(bytes);
	}
}

function inflateError(): Error {
	return new Error("mdom: archive inflates past maxUncompressedBytes");
}

/** Inflates the BCFZ payload that follows the 4-byte header. */
function decompress(
	bytes: Uint8Array,
	start: number,
	limit: number,
): Uint8Array {
	const reader = new BitReader(bytes, start);
	const expectedLength =
		reader.bits(8) |
		(reader.bits(8) << 8) |
		(reader.bits(8) << 16) |
		(reader.bits(8) << 24);
	if (expectedLength < 0 || expectedLength > limit) {
		throw inflateError();
	}
	const out = new Uint8Array(expectedLength);
	let length = 0;
	// A stream may end mid-token once its content is complete, so running out
	// of bits stops inflation rather than failing it.
	while (length < expectedLength && !reader.exhausted) {
		try {
			length = inflateToken(reader, out, length);
		} catch (error) {
			if (error instanceof TruncatedError) {
				break;
			}
			throw error;
		}
	}
	// The expected length counts the 4-byte BCFS header, which is not part of the blocks.
	return out.subarray(4, length);
}

/** Inflates one literal run or back-reference into `out`, returning the new length. */
function inflateToken(
	reader: BitReader,
	out: Uint8Array,
	start: number,
): number {
	const expectedLength = out.length;
	let length = start;
	if (reader.bit() === 1) {
		const wordSize = reader.bits(4);
		const offset = reader.bitsReversed(wordSize);
		const size = reader.bitsReversed(wordSize);
		const source = length - offset;
		if (source < 0) {
			throw new Error("Corrupt Guitar Pro 6 container");
		}
		const count = Math.min(offset, size, expectedLength - length);
		out.copyWithin(length, source, source + count);
		length += count;
	} else {
		const size = reader.bitsReversed(2);
		for (let index = 0; index < size && length < expectedLength; index++) {
			out[length++] = reader.bits(8);
		}
	}
	return length;
}

function readFiles(blocks: Uint8Array, limit: number): Map<string, Uint8Array> {
	const files = new Map<string, Uint8Array>();
	let remaining = limit;
	// The first sector is empty; entries begin at the second.
	let offset = SECTOR_SIZE;
	while (offset + 3 < blocks.length) {
		if (readInt(blocks, offset) === 2) {
			const name = readString(blocks, offset + 0x04, 127);
			const size = readInt(blocks, offset + 0x8c);
			const chunks: Uint8Array[] = [];
			const pointers = offset + 0x94;
			let total = 0;
			for (let index = 0; ; index++) {
				const sector = readInt(blocks, pointers + 4 * index);
				if (sector <= 0) {
					break;
				}
				const sectorStart = sector * SECTOR_SIZE;
				if (sectorStart >= blocks.length) {
					throw new Error("Corrupt Guitar Pro 6 container");
				}
				// The next entry starts after the last data sector.
				offset = sectorStart;
				chunks.push(blocks.subarray(sectorStart, sectorStart + SECTOR_SIZE));
				total += SECTOR_SIZE;
			}
			const fileSize = Math.max(0, Math.min(size, total));
			remaining -= fileSize;
			if (remaining < 0) {
				throw inflateError();
			}
			const data = new Uint8Array(fileSize);
			let written = 0;
			for (const chunk of chunks) {
				const part = chunk.subarray(0, fileSize - written);
				data.set(part, written);
				written += part.length;
			}
			files.set(name, data);
		}
		offset += SECTOR_SIZE;
	}
	return files;
}

function readInt(data: Uint8Array, offset: number): number {
	return (
		((data[offset + 3] ?? 0) << 24) |
		((data[offset + 2] ?? 0) << 16) |
		((data[offset + 1] ?? 0) << 8) |
		(data[offset] ?? 0)
	);
}

function readString(data: Uint8Array, offset: number, length: number): string {
	let text = "";
	for (let index = 0; index < length; index++) {
		const code = data[offset + index];
		if (code === undefined || code === 0) {
			break;
		}
		text += String.fromCharCode(code);
	}
	return text;
}
