import type { LyricExtend } from "./lyric";
import { MElement } from "./m-element";

/**
 * One `<figure>` of a figured-bass stack: a numeral with an optional accidental
 * before or after it (`#6`, `4+`), or an accidental on its own.
 */
export class Figure extends MElement {
	constructor() {
		super("figure");
	}

	/** `<prefix>`: the accidental printed before the numeral (sharp/flat/natural/slash/…); null when none. */
	get prefix(): string | null {
		return this.child("prefix")?.text ?? null;
	}

	/** `<figure-number>`: the numeral itself, kept as a string; null when the figure is an accidental alone. */
	get number(): string | null {
		return this.child("figure-number")?.text ?? null;
	}

	/** `<suffix>`: the accidental or stroke printed after the numeral; null when none. */
	get suffix(): string | null {
		return this.child("suffix")?.text ?? null;
	}

	/** Whether an `<extend>` line trails this figure (it holds through the next bass notes). */
	get extend(): boolean {
		return this.child("extend") !== null;
	}

	/** Which end of the extend line the `<extend>` marks; null when it states none or there is none. */
	get extendType(): LyricExtend | null {
		const type = this.child("extend")?.getAttribute("type");
		return type === "start" || type === "stop" || type === "continue"
			? type
			: null;
	}
}
