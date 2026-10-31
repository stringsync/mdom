import { MElement } from "./m-element";
import { appendValue, Measure } from "./measure";
import { colorOf } from "./print-style";
import { childIndexIn, divisionsBackFrom } from "./signature";
import { onsetOf } from "./timeline";

/** A `<barline>` to write: the bar style, and any repeat or volta on it. */
export interface BarlineSpec {
	/** Which edge; 'right' (the MusicXML default) when omitted. */
	location?: "left" | "right" | "middle";
	/** `<bar-style>` (light-heavy, heavy-light, light-light, dotted, ...). */
	barStyle?: string;
	repeat?: { direction: "forward" | "backward"; times?: number };
	/** The volta bracket; see {@link EndingSpec}. */
	ending?: EndingSpec;
}

/**
 * A volta bracket edge to write. `start` opens it on the first measure's left
 * barline; `stop` (closing with a downward jog, as a first ending does) or
 * `discontinue` (no jog, as a last ending does) closes it on the last measure's
 * right barline.
 */
export interface EndingSpec {
	type: "start" | "stop" | "discontinue";
	/**
	 * Which times through the ending plays: a list of passes (`[1, 2]`), or
	 * MusicXML's raw spelling (`'1, 2'`, or blanks for an ending whose passes are
	 * unknown).
	 */
	number: number[] | string;
	/** What is printed in the bracket when it differs from the numbers (`'1.-3.'`). */
	text?: string;
}

/** A volta bracket edge as read: the raw `number`, the passes it lists, and its printed text. */
export interface Ending {
	type: "start" | "stop" | "discontinue";
	/** MusicXML's raw list spelling (`"1,2"`); see {@link numbers} for the passes. */
	number: string;
	/**
	 * The passes it plays on, ascending, parsed from {@link number}. A `1-3` range
	 *, invalid MusicXML some exporters write anyway, expands; blanks read as
	 * no passes.
	 */
	numbers: number[];
	/** The printed text: the element's own text, or {@link number} when it has none. */
	text: string;
}

/**
 * A `<barline>` in a measure: its bar style (final, double, dotted, ...) and any
 * repeat marker. MusicXML attaches it to the measure edge named by
 * {@link location}, and a measure can carry several (a left repeat and a right
 * repeat). A renderer reads it to draw the boundary and reserve its width.
 */
export class Barline extends MElement {
	constructor() {
		super("barline");
	}

	/** Which edge it sits on: 'right' (the MusicXML default), 'left', or 'middle'. */
	get location(): string {
		return this.getAttribute("location") ?? "right";
	}

	/** `<bar-style>` (light-heavy, heavy-light, light-light, dotted, ...), or null for a plain barline. */
	get barStyle(): string | null {
		return this.child("bar-style")?.text ?? null;
	}

	/** `<repeat>` direction ('forward'/'backward') when this is a repeat barline, else null. */
	get repeat(): string | null {
		return this.child("repeat")?.getAttribute("direction") ?? null;
	}

	/**
	 * The `<ending>` (volta) bracket, or null when there is none: its raw
	 * `number`, the passes that lists, and the text printed in it.
	 */
	get ending(): Ending | null {
		const ending = this.child("ending");
		if (!ending) {
			return null;
		}
		const number = ending.getAttribute("number") ?? "";
		const text = ending.text?.trim() ?? "";
		return {
			type: ending.getAttribute("type") as Ending["type"],
			number,
			numbers: endingPasses(number),
			text: text === "" ? number : text,
		};
	}

	/**
	 * The `times` attribute of the `<repeat>` child (how many times to repeat),
	 * parsed to a number; null when there is no `<repeat>` or no `times`. MusicXML's
	 * implied default is 2, left to the consumer, matching {@link repeat}.
	 */
	get repeatTimes(): number | null {
		const times = this.child("repeat")?.getAttribute("times");
		return times == null ? null : Number(times);
	}

	/**
	 * Onset within the measure, in beats, where this barline sits in the
	 * backup/forward fold. Meaningful for `location="middle"`, a divider written
	 * between two notes (a double bar or dotted divider mid-bar); the edges are 0
	 * and the measure's end beat.
	 */
	get measureBeat(): number | null {
		const measure = this.closest(Measure);
		if (!measure) {
			return null;
		}
		const divisions = divisionsBackFrom(measure, childIndexIn(measure, this));
		const onset = onsetOf(measure, this);
		if (divisions == null || onset == null) {
			return null;
		}
		return onset / divisions;
	}

	/** The normalized `color`; null when unset. */
	get color(): string | null {
		return colorOf(this);
	}
}

/** Build a detached `<barline>` from a spec, children in schema order. */
export function buildBarline(spec: BarlineSpec): Barline {
	const barline = new Barline();
	if (spec.location != null) {
		barline.setAttribute("location", spec.location);
	}
	if (spec.barStyle != null) {
		appendValue(barline, "bar-style", spec.barStyle);
	}
	if (spec.ending) {
		barline.append(buildEnding(spec.ending));
	}
	if (spec.repeat) {
		const repeat = new MElement("repeat");
		repeat.setAttribute("direction", spec.repeat.direction);
		if (spec.repeat.times != null) {
			repeat.setAttribute("times", String(spec.repeat.times));
		}
		barline.append(repeat);
	}
	return barline;
}

/**
 * Build a detached `<ending>`. It prints its own text content; MusicXML repeats
 * the number there, so defaulting to it is what a caller passing just `number`
 * means.
 */
export function buildEnding(spec: EndingSpec): MElement {
	const number =
		typeof spec.number === "string" ? spec.number : spec.number.join(",");
	if (
		typeof spec.number !== "string" &&
		(spec.number.length === 0 ||
			!spec.number.every((pass) => Number.isInteger(pass) && pass > 0))
	) {
		throw new Error(
			`mdom: ending passes must be positive integers, got [${spec.number.join(", ")}]`,
		);
	}
	const ending = new MElement("ending");
	ending.setText(spec.text ?? number);
	ending.setAttribute("number", number);
	ending.setAttribute("type", spec.type);
	return ending;
}

/** The passes an ending `number` lists, ascending: `"1, 2"`, and the invalid range `"1-3"`. */
function endingPasses(number: string): number[] {
	const passes = new Set<number>();
	for (const piece of number.split(",")) {
		const range = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(piece);
		if (!range) {
			continue;
		}
		const first = Number(range[1]);
		const last = range[2] == null ? first : Number(range[2]);
		for (let pass = first; pass <= last; pass++) {
			if (pass > 0) {
				passes.add(pass);
			}
		}
	}
	return [...passes].sort((left, right) => left - right);
}
