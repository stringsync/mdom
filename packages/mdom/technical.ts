import { MElement } from './m-node';
import {
	type Position,
	type PositionSpec,
	placementOf,
	positionOf,
	setPositionOf,
} from './print-style';

/**
 * Every tag this class is registered for — the `<technical>` children that carry
 * a playing instruction. `<hammer-on>`/`<pull-off>` are left out: they're
 * spanners with their own classes.
 */
export const TECHNICAL_TAGS = [
	'up-bow',
	'down-bow',
	'harmonic',
	'open-string',
	'thumb-position',
	'fingering',
	'pluck',
	'double-tongue',
	'triple-tongue',
	'stopped',
	'snap-pizzicato',
	'fret',
	'string',
	'tap',
	'heel',
	'toe',
	'fingernails',
	'hole',
	'arrow',
	'handbell',
	'brass-bend',
	'flip',
	'smear',
	'golpe',
	'half-muted',
	'harmon-mute',
	'bend',
	'other-technical',
];

/** How a harmonic is produced: on the open string's node, or stopped (pinch included). */
export type HarmonicKind = 'natural' | 'artificial';

/** Which pitch a harmonic's note is written at: the played, touched or heard one. */
export type HarmonicPitch = 'base' | 'touching' | 'sounding';

/** The `shape` of a `<bend>` line: drawn with a corner, or as a curve. */
export type BendShape = 'angled' | 'curved';

export const HARMONIC_KINDS: readonly HarmonicKind[] = [
	'natural',
	'artificial',
];
export const HARMONIC_PITCHES: readonly HarmonicPitch[] = [
	'base',
	'touching',
	'sounding',
];

/** The payload of one `<harmonic>`: either field null when unstated. */
export interface HarmonicDetail {
	kind: HarmonicKind | null;
	pitch: HarmonicPitch | null;
}

/** The payload of one `<bend>`. */
export interface BendDetail {
	/** `<bend-alter>` in semitones; negative for a release. */
	alter: number;
	/** `<pre-bend/>`: bent before the string is struck. */
	preBend: boolean;
	/** `<release>`: let back down; its `offset` in divisions when stated. */
	release: { offset: number | null } | null;
	/** `<with-bar>` text (a whammy-bar scoop or dip, e.g. `scoop`); null when absent. */
	withBar: string | null;
	/** `shape`; null when unstated. */
	shape: BendShape | null;
	/** `first-beat`/`last-beat`: percent of the note where the bend starts/ends. */
	firstBeat: number | null;
	lastBeat: number | null;
}

/**
 * One child of `<notations><technical>`: a fingering, a pluck letter, a bowing
 * mark, an open string, and so on. Like an ornament, MusicXML names the marking
 * by the TAG, so {@link technicalType} identifies it and {@link text} carries the
 * value when there is one (a fingering's digit, a pluck's letter).
 *
 * Read them through {@link Note.technicals}. The common tablature reads —
 * `string`, `fret`, `bend`, `isHarmonic` — stay on {@link Note} directly.
 *
 * Like {@link Ornament} it stands in for a whole family of tags, so it keeps
 * `MElement`'s tag-taking constructor: the registry passes the tag it matched.
 */
export class Technical extends MElement {
	/** Which mark this is — the element's own tag. */
	get technicalType(): string {
		return this.tag;
	}

	/**
	 * The `<harmonic>` payload — its natural/artificial kind and which pitch the
	 * note is written at; null when this is no harmonic.
	 */
	get harmonic(): HarmonicDetail | null {
		if (this.tag !== 'harmonic') {
			return null;
		}
		const kind = HARMONIC_KINDS.find((name) => this.child(name));
		const pitch = HARMONIC_PITCHES.find((name) => this.child(`${name}-pitch`));
		return { kind: kind ?? null, pitch: pitch ?? null };
	}

	/** The `<bend>` payload; null when this is no bend. */
	get bend(): BendDetail | null {
		if (this.tag !== 'bend') {
			return null;
		}
		const release = this.child('release');
		const shape = this.getAttribute('shape');
		return {
			alter: Number(this.child('bend-alter')?.text ?? 0),
			preBend: this.child('pre-bend') !== null,
			release: release ? { offset: numberAttribute(release, 'offset') } : null,
			withBar: this.child('with-bar')?.text ?? null,
			shape: shape === 'angled' || shape === 'curved' ? shape : null,
			firstBeat: numberAttribute(this, 'first-beat'),
			lastBeat: numberAttribute(this, 'last-beat'),
		};
	}

	/**
	 * The `smufl` glyph name, which an `<other-technical>` (or any mark) may give
	 * to say how its free text draws; null when unset.
	 */
	get smufl(): string | null {
		return this.getAttribute('smufl');
	}

	/** `placement`; null when unstated. */
	get placement(): 'above' | 'below' | null {
		return placementOf(this);
	}

	/** `<fingering alternate="yes">` — a second option, printed "(2)". */
	get alternate(): boolean {
		return this.getAttribute('alternate') === 'yes';
	}

	/** `<fingering substitution="yes">` — change fingers while the key is held, printed "5-3". */
	get substitution(): boolean {
		return this.getAttribute('substitution') === 'yes';
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

/** A numeric attribute, leniently: null unless a finite number. */
function numberAttribute(element: MElement, name: string): number | null {
	const raw = element.getAttribute(name);
	if (raw == null || raw.trim() === '') {
		return null;
	}
	const value = Number(raw);
	return Number.isFinite(value) ? value : null;
}
