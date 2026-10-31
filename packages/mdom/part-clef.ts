import { MElement } from "./m-element";
import { required } from "./m-node";

/**
 * A `<part-clef>` inside `<for-part>`: the clef a transposed part created from
 * a concert score switches to, as for a bass clarinet read in treble clef.
 */
export class PartClef extends MElement {
	constructor() {
		super("part-clef");
	}

	/** `<sign>`. Required by the schema. */
	get sign(): string {
		return required(this.child("sign")?.text, "<sign> in <part-clef>");
	}

	/** `<line>`; null when unstated, its default depending on the sign. */
	get line(): number | null {
		const line = this.child("line")?.text;
		return line == null ? null : Number(line);
	}

	/** `<clef-octave-change>`; null when unstated. */
	get octaveChange(): number | null {
		const octaves = this.child("clef-octave-change")?.text;
		return octaves == null ? null : Number(octaves);
	}
}

/** A `<part-clef>`, as the clef group spells it. */
export interface PartClefSpec {
	sign: string;
	line?: number;
	octaveChange?: number;
}
