import { MElement } from "./m-element";
import {
	colorOf,
	type Position,
	type PositionSpec,
	placementOf,
	positionOf,
	setPositionOf,
	setYesNo,
	yesNoOf,
} from "./print-style";
import { Score } from "./score";
import {
	type Font,
	type FontSpec,
	fontOf,
	resolveFont,
	setFontOf,
} from "./text-format";

/** How a syllable joins its neighbours: a whole word, or one piece of one. */
export type Syllabic = "single" | "begin" | "end" | "middle";

/** Which end of a melisma line an `<extend>` marks; null when it states none. */
export type LyricExtend = "start" | "stop" | "continue";

/**
 * What {@link Note.setLyric} writes: one syllable of one verse.
 *
 * `text` is the syllable, or several words sung on the one note (an elision,
 * "look it"), joined by `elision`: the symbol drawn between them, left to the
 * renderer when unstated. Leave `syllabic` out and mdom reads it off the
 * hyphens the way lyrics are typed: `"lov-"` begins a word, `"-ing-"` sits in
 * the middle of one, `"-ly"` ends one, and `"love"` is a word of its own, the
 * hyphens dropped from the text. Give `syllabic` and the text is written as is.
 *
 * `extend` draws a melisma line after the syllable: `true` for a plain
 * `<extend/>`, or the end of the line it marks. A lyric of only an extend
 * (`{ extend: 'continue' }` or `'stop'`) carries the line on through a later
 * note of the melisma.
 */
export interface LyricSpec {
	text?: string | readonly string[];
	/** The verse, '1' when left out. */
	verse?: string;
	/** The lyric's part ("verse", "chorus", …). */
	name?: string;
	syllabic?: Syllabic;
	/** What an elision between the `text` runs draws; '' or unset leaves it to the renderer. */
	elision?: string;
	extend?: boolean | LyricExtend;
	placement?: "above" | "below";
}

/**
 * One run of a syllable: a `<text>` or an `<elision>` between two. `font` is
 * what the run states, a null field inheriting; `resolvedFont` fills those from
 * the score's `<defaults>` lyric font for this verse.
 */
export interface LyricRun {
	kind: "text" | "elision";
	text: string;
	font: Font;
	resolvedFont: Font;
	/** The normalized `color`; null when unset. */
	color: string | null;
}

/**
 * A `<lyric>` under a `<note>`: one syllable of one verse. A note carries one
 * per verse (see {@link Note.lyrics}). The syllable text is often the widest
 * thing under a note, so a renderer measures it for horizontal spacing.
 */
export class Lyric extends MElement {
	constructor() {
		super("lyric");
	}

	/** Verse/line this belongs to; '1' when omitted (read off `number`, like a staff off a clef). */
	get verse(): string {
		return this.getAttribute("number") ?? "1";
	}

	/** The `name` attribute (a lyric's part: "verse", "chorus", …); null when unstated. */
	get name(): string | null {
		return this.getAttribute("name");
	}

	/**
	 * The syllable, all `<text>` runs joined (an elided syllable holds several).
	 * '' when the lyric carries no text, an empty syllable takes no width.
	 */
	get syllable(): string {
		return this.childrenNamed("text")
			.map((textNode) => textNode.text ?? "")
			.join("");
	}

	/** `<syllabic>`: where this sits in a word, or null when unspecified. */
	get syllabic(): Syllabic | null {
		return (this.child("syllabic")?.text ?? null) as Syllabic | null;
	}

	/**
	 * The syllable's runs in document order, so a consumer can render the elision
	 * separators {@link syllable} joins away. An empty `<elision/>` leaves the
	 * symbol to the renderer (a space is the conventional pick); one carrying text
	 * (an undertie, an underscore) uses that.
	 */
	get runs(): LyricRun[] {
		const inherited = this.inheritedFont;
		return this.runElements().map((child) => {
			const font = fontOf(child);
			return {
				kind: child.tag as LyricRun["kind"],
				text: child.text ?? "",
				font,
				resolvedFont: resolveFont(font, inherited),
				color: colorOf(child),
			};
		});
	}

	/**
	 * The score's default font for this lyric: the `<defaults><lyric-font>`
	 * matching its verse and name; null when none does or the lyric is detached.
	 */
	get inheritedFont(): Font | null {
		return (
			this.closest(Score)?.getLyricFont(this.verse, this.name)?.font ?? null
		);
	}

	/** Replace the font attributes of run `index` (see {@link runs}); null removes them. */
	setRunFont(index: number, spec: FontSpec | null): void {
		const run = this.runElements()[index];
		if (!run) {
			throw new RangeError(`mdom: lyric has no run ${index}`);
		}
		setFontOf(run, spec);
	}

	private runElements(): MElement[] {
		return this.childrenOfType(MElement).filter(
			(child) => child.tag === "text" || child.tag === "elision",
		);
	}

	/** Whether a melisma `<extend>` line trails this syllable. */
	get extend(): boolean {
		return this.child("extend") !== null;
	}

	/** Which end of the melisma line the `<extend>` marks; null when it states none or there is none. */
	get extendType(): LyricExtend | null {
		const type = this.child("extend")?.getAttribute("type");
		return type === "start" || type === "stop" || type === "continue"
			? type
			: null;
	}

	/** `placement`: above or below the staff; null when unstated. */
	get placement(): "above" | "below" | null {
		return placementOf(this);
	}

	/** The normalized `color`; null when unset. */
	get color(): string | null {
		return colorOf(this);
	}

	/** Whether the lyric is drawn (`print-object`); true when unstated. */
	get printObject(): boolean {
		return yesNoOf(this, "print-object", true);
	}

	/** Set `print-object`, or remove it with null to restore the default. */
	setPrintObject(value: boolean | null): void {
		setYesNo(this, "print-object", value);
	}
	/** Where this is drawn, in tenths. Layout only: it never moves the onset. */
	get position(): Position {
		return positionOf(this);
	}

	/** Replace the position attributes; null removes them all. */
	setPosition(spec: PositionSpec | null): void {
		setPositionOf(this, spec);
	}
}

/** Build the `<lyric>` a {@link LyricSpec} describes, in the schema's child order. */
export function buildLyric(spec: LyricSpec): Lyric {
	const texts =
		typeof spec.text === "string" ? [spec.text] : [...(spec.text ?? [])];
	if (texts.length === 0 && !spec.extend) {
		throw new Error("mdom: a lyric needs text or an extend");
	}
	const lyric = new Lyric();
	if (spec.verse !== undefined) {
		lyric.setAttribute("number", spec.verse);
	}
	if (spec.name !== undefined) {
		lyric.setAttribute("name", spec.name);
	}
	if (spec.placement !== undefined) {
		lyric.setAttribute("placement", spec.placement);
	}
	if (texts.length > 0) {
		const syllabic = spec.syllabic ?? syllabicFromHyphens(texts);
		const syllabicNode = new MElement("syllabic");
		syllabicNode.setText(syllabic);
		lyric.append(syllabicNode);
		texts.forEach((run, index) => {
			if (index > 0) {
				const elision = new MElement("elision");
				if (spec.elision) {
					elision.setText(spec.elision);
				}
				lyric.append(elision);
			}
			const textNode = new MElement("text");
			textNode.setText(run);
			lyric.append(textNode);
		});
	}
	if (spec.extend) {
		const extend = new MElement("extend");
		if (spec.extend !== true) {
			extend.setAttribute("type", spec.extend);
		}
		lyric.append(extend);
	}
	return lyric;
}

/**
 * Read where the syllable sits in its word off a leading and trailing hyphen,
 * dropping them from `texts` in place. A run of only hyphens stays as typed.
 */
function syllabicFromHyphens(texts: string[]): Syllabic {
	const last = texts.length - 1;
	const continuesBefore = /^-+(?=[^-])/.test(texts[0]!);
	const continuesAfter = /(?<=[^-])-+$/.test(texts[last]!);
	if (continuesBefore) {
		texts[0] = texts[0]!.replace(/^-+/, "");
	}
	if (continuesAfter) {
		texts[last] = texts[last]!.replace(/-+$/, "");
	}
	if (continuesBefore) {
		return continuesAfter ? "middle" : "end";
	}
	return continuesAfter ? "begin" : "single";
}
