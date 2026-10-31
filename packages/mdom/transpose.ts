import { TransposeGroup, type TransposeSpec } from "./transpose-group";

/**
 * A `<transpose>` inside `<attributes>`: how the part's written pitches relate
 * to sounding ones, from here until the next declaration for its staff. A
 * numberless one applies to every staff of the part. Read it in effect with
 * {@link Measure.getTranspose} or {@link Note.transpose}.
 */
export class Transpose extends TransposeGroup {
	constructor() {
		super("transpose");
	}

	/** The staff this applies to; null when numberless, which means every staff. */
	get staff(): string | null {
		return this.getAttribute("number");
	}
}

/** A `<transpose>` element built from `spec`, detached. */
export function buildTranspose(spec: TransposeSpec, staff?: string): Transpose {
	const transpose = new Transpose();
	if (staff != null) {
		transpose.setAttribute("number", staff);
	}
	transpose.setTransposition(spec);
	return transpose;
}

/**
 * Whether `transpose` shifts pitch class, which a concert score may not state
 * on a `<transpose>`: non-zero `<diatonic>` or `<chromatic>`. Octave shifts and
 * doublings are allowed there.
 */
export function shiftsPitchClass(transpose: TransposeGroup): boolean {
	return (transpose.diatonic ?? 0) !== 0 || transpose.chromatic !== 0;
}
