import { MElement } from './m-node';
import {
	colorOf,
	type Position,
	type PositionSpec,
	positionOf,
	setPositionOf,
	setYesNo,
	yesNoOf,
} from './print-style';
import { Score } from './score';
import {
	type Font,
	type FontSpec,
	fontOf,
	resolveFont,
	setFontOf,
} from './text-format';

/** How a syllable joins its neighbours: a whole word, or one piece of one. */
export type Syllabic = 'single' | 'begin' | 'end' | 'middle';

/**
 * One run of a syllable: a `<text>` or an `<elision>` between two. `font` is
 * what the run states, a null field inheriting; `resolvedFont` fills those from
 * the score's `<defaults>` lyric font for this verse.
 */
export interface LyricRun {
	kind: 'text' | 'elision';
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
		super('lyric');
	}

	/** Verse/line this belongs to; '1' when omitted (read off `number`, like a staff off a clef). */
	get verse(): string {
		return this.getAttribute('number') ?? '1';
	}

	/** The `name` attribute (a lyric's part: "verse", "chorus", …); null when unstated. */
	get name(): string | null {
		return this.getAttribute('name');
	}

	/**
	 * The syllable, all `<text>` runs joined (an elided syllable holds several).
	 * '' when the lyric carries no text — an empty syllable takes no width.
	 */
	get syllable(): string {
		return this.childrenNamed('text')
			.map((textNode) => textNode.text ?? '')
			.join('');
	}

	/** `<syllabic>`: where this sits in a word, or null when unspecified. */
	get syllabic(): Syllabic | null {
		return (this.child('syllabic')?.text ?? null) as Syllabic | null;
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
				kind: child.tag as LyricRun['kind'],
				text: child.text ?? '',
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
			(child) => child.tag === 'text' || child.tag === 'elision',
		);
	}

	/** Whether a melisma `<extend>` line trails this syllable. */
	get extend(): boolean {
		return this.child('extend') !== null;
	}

	/** The normalized `color`; null when unset. */
	get color(): string | null {
		return colorOf(this);
	}

	/** Whether the lyric is drawn (`print-object`); true when unstated. */
	get printObject(): boolean {
		return yesNoOf(this, 'print-object', true);
	}

	/** Set `print-object`, or remove it with null to restore the default. */
	setPrintObject(value: boolean | null): void {
		setYesNo(this, 'print-object', value);
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
