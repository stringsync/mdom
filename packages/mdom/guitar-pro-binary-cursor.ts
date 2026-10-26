/** Little-endian reader over untrusted Guitar Pro 3-5 bytes; every read is bounds-checked. */
export class GuitarProBinaryCursor {
	private offset = 0;
	constructor(private readonly bytes: Uint8Array) {}

	get remaining(): number {
		return this.bytes.length - this.offset;
	}

	skip(count: number): void {
		this.take(count);
	}

	byte(): number {
		return this.take(1)[0]!;
	}

	signedByte(): number {
		const value = this.byte();
		return value > 127 ? value - 256 : value;
	}

	int16(): number {
		return this.view(2).getInt16(0, true);
	}

	int32(): number {
		return this.view(4).getInt32(0, true);
	}

	float64BigEndian(): number {
		return this.view(8).getFloat64(0, false);
	}

	/** A length byte followed by a fixed-width field of `width` bytes. */
	fixedString(width: number): string {
		const length = this.byte();
		return decode(this.take(width).subarray(0, Math.min(length, width)));
	}

	/** A 4-byte size, then that many bytes. */
	intString(): string {
		return decode(this.take(this.nonNegative(this.int32(), 'string length')));
	}

	/** A 4-byte size that counts one extra byte, a length byte, then the text. */
	intByteString(): string {
		const size = this.nonNegative(this.int32(), 'string length');
		this.byte();
		return decode(this.take(this.nonNegative(size - 1, 'string length')));
	}

	/** A 4-byte field that carries no text, then a length byte and the text. */
	unusedIntString(): string {
		this.skip(4);
		return decode(this.take(this.byte()));
	}

	/** Rejects counts that would drive a loop past what the file or the limit allows. */
	count(value: number, limit: number, label: string): number {
		if (value < 0 || value > limit) {
			throw new Error(
				`Guitar Pro ${label} ${value} is outside the supported range 0 to ${limit}`,
			);
		}
		return value;
	}

	private nonNegative(value: number, label: string): number {
		return this.count(value, Number.MAX_SAFE_INTEGER, label);
	}

	private view(length: number): DataView {
		const taken = this.take(length);
		return new DataView(taken.buffer, taken.byteOffset, length);
	}

	private take(length: number): Uint8Array {
		if (length < 0 || length > this.remaining) {
			throw new Error('Guitar Pro file ends unexpectedly');
		}
		const slice = this.bytes.subarray(this.offset, this.offset + length);
		this.offset += length;
		return slice;
	}
}

/** Guitar Pro 5 writes UTF-8 from recent versions and Windows-1252 from older ones. */
function decode(bytes: Uint8Array): string {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder('windows-1252').decode(bytes);
	}
}
