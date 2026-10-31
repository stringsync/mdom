import { TruncatedError } from "./guitar-pro-truncated-error";

/** Bit reader over a byte array: bits come most significant first. */
export class BitReader {
	private position = 0;

	constructor(
		private readonly data: Uint8Array,
		start: number,
	) {
		this.position = start * 8;
	}

	get exhausted(): boolean {
		return this.position >= this.data.length * 8;
	}

	bit(): number {
		const byte = this.data[this.position >> 3];
		if (byte === undefined) {
			throw new TruncatedError("Truncated Guitar Pro 6 container");
		}
		const value = (byte >> (7 - (this.position & 7))) & 1;
		this.position++;
		return value;
	}

	bits(count: number): number {
		let value = 0;
		for (let index = 0; index < count; index++) {
			value = (value << 1) | this.bit();
		}
		return value;
	}

	/** Reads `count` bits, least significant first. */
	bitsReversed(count: number): number {
		let value = 0;
		for (let index = 0; index < count; index++) {
			value |= this.bit() << index;
		}
		return value;
	}
}
