import { Bracket } from './bracket';
import { Dashes } from './dashes';
import { Dynamics } from './dynamics';
import { MElement, required } from './m-node';
import { appendValue, Measure } from './measure';
import { buildMetronome, Metronome, type MetronomeSpec } from './metronome';

export type { MetronomeSpec } from './metronome';

import { adjacentNote, type Note, type NoteType } from './note';
import { OctaveShift } from './octave-shift';
import { type Offset, type OffsetSpec, offsetOf, writeOffset } from './offset';
import { Pedal } from './pedal';
import { colorOf, placementOf, setYesNo, yesNoOf } from './print-style';
import { Rehearsal } from './rehearsal';
import { divisionsBackFrom } from './signature';
import { Sound, type SoundSpec, writeSound } from './sound';
import type { FontSize, TextAlign, TextVerticalAlign } from './text-format';
import { onsetOf } from './timeline';
import { Wedge } from './wedge';
import { Words } from './words';

/** A `<words>` to write: the text, and the font it is measured and drawn in. */
export interface WordsSpec {
	text: string;
	fontStyle?: string;
	fontWeight?: string;
	/** A comma-separated list of family names, or a generic family (`serif`). */
	fontFamily?: string;
	fontSize?: FontSize;
	justify?: TextAlign;
	halign?: TextAlign;
	valign?: TextVerticalAlign;
}

/**
 * A `<direction>` to write. At least one printable — a metronome, a segno or
 * coda sign, words or dynamics — is required, since that is what a
 * `<direction-type>` holds; each gets its own block, in the order listed here.
 * `tempo` and `sound` add the silent `<sound>` that makes the mark actually play
 * back.
 */
export interface DirectionSpec {
	metronome?: MetronomeSpec;
	/** Print a segno sign. Pair it with `sound.segno` so playback finds it. */
	segno?: boolean;
	/** Print a coda sign. Pair it with `sound.coda` so playback finds it. */
	coda?: boolean;
	words?: string | WordsSpec;
	/**
	 * Dynamic marking names. MusicXML names these by TAG (`<dynamics><sfz/>`), so
	 * a name is written through as a tag — spell it the way MusicXML does.
	 */
	dynamics?: string | string[];
	/** The `<sound>` `tempo` attribute, in quarter notes per minute. */
	tempo?: number;
	/** The repeat-structure playback — segno, coda and jump — on the `<sound>`. */
	sound?: SoundSpec;
	placement?: 'above' | 'below';
	staff?: string;
	/**
	 * Print it where the system's first-measure attributes go — `directive="yes"`,
	 * as a tempo or style heading is — rather than over the note it starts at.
	 */
	directive?: boolean;
	/**
	 * An `<offset>` from the cursor position, in quarter-note beats; `sound`
	 * says whether playback moves with it or only the print does.
	 */
	offset?: OffsetSpec;
}

/** `<direction>` children that follow `<offset>`. */
const AFTER_OFFSET = new Set([
	'footnote',
	'level',
	'voice',
	'staff',
	'sound',
	'listening',
]);

/**
 * A repeat-structure mark to write, printed and played: a segno or coda sign a
 * jump lands on, or the jump itself. Each prints what a reader expects (`D.S.
 * al Coda`, `To Coda`) unless `text` says otherwise, and carries the `<sound>`
 * attribute that makes playback take it. `id` pairs a jump with its landmark
 * when a score has several; the default pairs the one D.S. with the one segno
 * and the one to-coda with the one coda.
 */
export type NavigationSpec = (
	| { kind: 'segno'; id?: string }
	| { kind: 'coda'; id?: string }
	| { kind: 'to-coda'; id?: string; text?: string }
	| { kind: 'da-capo'; until?: 'fine' | 'coda'; text?: string }
	| {
			kind: 'dal-segno';
			id?: string;
			until?: 'fine' | 'coda';
			text?: string;
	  }
	| { kind: 'fine'; text?: string }
) & {
	/** Where in the measure, in quarter-note beats; the write cursor when omitted. */
	onset?: number;
	/** 'above' when omitted, where these marks print. */
	placement?: 'above' | 'below';
	staff?: string;
};

/**
 * A `<direction>`: an instruction attached to a point in the timeline, with no
 * `<duration>` of its own. Everything printable it carries hangs off a
 * `<direction-type>` block — often several, side by side (a tempo rate in one and
 * a note-group relation in the next) — so the collectors here read across all of
 * them and the caller never walks the nesting.
 */
export class Direction extends MElement {
	constructor() {
		super('direction');
	}

	/** `<wedge>` (hairpin) markers under this direction. */
	get wedges(): Wedge[] {
		return this.markers(Wedge);
	}

	/** `<pedal>` markers under this direction. */
	get pedals(): Pedal[] {
		return this.markers(Pedal);
	}

	/** `<octave-shift>` markers under this direction. */
	get octaveShifts(): OctaveShift[] {
		return this.markers(OctaveShift);
	}

	/** `<bracket>` (phrase/analysis bracket) markers under this direction. */
	get brackets(): Bracket[] {
		return this.markers(Bracket);
	}

	/** `<dashes>` (the dashed line trailing a "cresc." or "rit.") markers under this direction. */
	get dashes(): Dashes[] {
		return this.markers(Dashes);
	}

	/**
	 * Every `<direction-type><metronome>`, document order. A direction routinely
	 * carries two — the rate in one `<direction-type>` and a note-group relation in
	 * the next, printed side by side.
	 */
	get metronomes(): Metronome[] {
		return this.markers(Metronome);
	}

	/** The `<direction-type><dynamics>` blocks under this direction, document order. */
	get dynamics(): Dynamics[] {
		return this.markers(Dynamics);
	}

	/** The `<direction-type><rehearsal>` marks under this direction, document order. */
	get rehearsals(): Rehearsal[] {
		return this.markers(Rehearsal);
	}

	/**
	 * The `<direction-type><words>` elements, document order — the typed form of
	 * {@link words}, carrying the font attributes a renderer measures with.
	 */
	get wordsElements(): Words[] {
		return this.markers(Words);
	}

	/**
	 * Every `<direction-type><other-direction>`, document order: a direction
	 * MusicXML has no element for. `text` is its free text, kept apart from
	 * `smufl`, the glyph name that says how it draws.
	 */
	get otherDirections(): Array<{ text: string; smufl: string | null }> {
		return this.directionTypeElements()
			.filter((element) => element.tag === 'other-direction')
			.map((element) => ({
				text: element.text ?? '',
				smufl: element.getAttribute('smufl'),
			}));
	}

	/**
	 * `<segno/>` and `<coda/>` markers under this direction, document order — the
	 * landmarks a D.S./D.C. jumps to.
	 */
	get navigations(): Array<'segno' | 'coda'> {
		return this.directionTypeElements()
			.filter((element) => element.tag === 'segno' || element.tag === 'coda')
			.map((element) => element.tag as 'segno' | 'coda');
	}

	/**
	 * The first `<direction-type><metronome>`, flattened to its leading beat unit.
	 * Kept for compatibility; {@link metronomes} is what a consumer should reach for
	 * — this one drops the second beat unit of a metric modulation, the
	 * `parentheses` attribute, and the `<metronome-note>` form entirely.
	 */
	get metronome(): {
		beatUnit: NoteType;
		dots: number;
		perMinute: string | null;
	} | null {
		const metronome = this.metronomes[0];
		const beatUnit = metronome?.beatUnits[0];
		if (!metronome || !beatUnit) {
			return null;
		}
		return {
			beatUnit: beatUnit.type,
			dots: beatUnit.dots,
			perMinute: metronome.perMinute,
		};
	}

	/** This direction's `<sound>` child (playback instructions), or null. */
	get sound(): Sound | null {
		return this.childrenOfType(Sound)[0] ?? null;
	}

	/**
	 * The `tempo` attribute of this direction's `<sound>` child, in quarter notes
	 * per minute; null when there is no `<sound>` or no `tempo`.
	 */
	get soundTempo(): number | null {
		return this.sound?.tempo ?? null;
	}

	/** Text of each `<direction-type><words>` (e.g. `ritardando`), document order. */
	get words(): string[] {
		return this.wordsElements.map((node) => node.text);
	}

	/**
	 * The staff this direction prints over; '1' when omitted, matching
	 * {@link Note.staff}. Without it every directive in a multi-staff part piles
	 * onto the top staff.
	 */
	get staff(): string {
		return this.child('staff')?.text ?? '1';
	}

	/** `placement`; null when unstated (the default is the renderer's choice). */
	get placement(): 'above' | 'below' | null {
		return placementOf(this);
	}

	/** The normalized `color`; null when unset. */
	get color(): string | null {
		return colorOf(this);
	}

	/**
	 * `directive`: printed where the system's first-measure attributes go, as a
	 * tempo or style heading is, rather than over the note it starts at. A
	 * layout instruction only; playback is unchanged.
	 */
	get isDirective(): boolean {
		return yesNoOf(this, 'directive', false);
	}

	/** Set `directive`, or remove it with null. */
	setDirective(value: boolean | null): void {
		setYesNo(this, 'directive', value);
	}

	/**
	 * The `<offset>` from this direction's cursor position, or null when it
	 * applies where it sits. Its `sound` is false unless stated: the print moves
	 * and playback stays at {@link measureBeat}.
	 */
	get offset(): Offset | null {
		return offsetOf(this, false);
	}

	/**
	 * Replace the `<offset>` from a beat count, converted with the divisions in
	 * effect here, or remove it with null. The direction must be in a measure
	 * with `<divisions>` declared.
	 */
	setOffset(offset: OffsetSpec | null): void {
		writeOffset(
			this,
			offset,
			() =>
				this.children.find(
					(child): child is MElement =>
						child instanceof MElement && AFTER_OFFSET.has(child.tag),
				) ?? null,
		);
	}

	/**
	 * Where in the measure playback takes this direction, in quarter-note beats:
	 * {@link measureBeat}, moved by an {@link offset} that says `sound="yes"`.
	 */
	get playbackBeat(): number | null {
		const beat = this.measureBeat;
		const offset = this.offset;
		if (beat == null || !offset?.sound) {
			return beat;
		}
		return offset.beats == null ? null : beat + offset.beats;
	}

	/** The nearest non-chord note after this direction in its measure (a pedal start binds here). */
	get nextNote(): Note | null {
		return adjacentNote(this, 1);
	}

	/** The nearest non-chord note before this direction in its measure (a pedal stop binds here). */
	get previousNote(): Note | null {
		return adjacentNote(this, -1);
	}

	/** The measure this direction sits in. An attached direction always has one. */
	get measure(): Measure {
		return required(this.closest(Measure), '<measure> ancestor of <direction>');
	}

	/**
	 * Onset within the measure, in beats — the cursor position where this
	 * `<direction>` sits in the backup/forward fold, before any {@link offset}.
	 */
	get measureBeat(): number | null {
		const measure = this.closest(Measure);
		if (!measure) {
			return null;
		}
		const divisions = divisionsBackFrom(
			measure,
			measure.children.indexOf(this),
		);
		const onset = onsetOf(measure, this);
		if (divisions == null || onset == null) {
			return null;
		}
		return onset / divisions;
	}

	private markers<T extends MElement>(type: new (...args: never[]) => T): T[] {
		return this.childrenNamed('direction-type').flatMap((directionType) =>
			directionType.childrenOfType(type),
		);
	}

	/** Every element across this direction's `<direction-type>` blocks, document order. */
	private directionTypeElements(): MElement[] {
		return this.childrenNamed('direction-type').flatMap((directionType) =>
			directionType.childrenOfType(MElement),
		);
	}
}

/** Build a detached `<direction>` from a spec, children in schema order. */
export function buildDirection(spec: DirectionSpec): Direction {
	const direction = new Direction();
	if (spec.placement != null) {
		direction.setAttribute('placement', spec.placement);
	}
	if (spec.directive) {
		direction.setDirective(true);
	}
	if (spec.metronome) {
		directionType(direction).append(buildMetronome(spec.metronome));
	}
	if (spec.segno) {
		directionType(direction).append(new MElement('segno'));
	}
	if (spec.coda) {
		directionType(direction).append(new MElement('coda'));
	}
	if (spec.words != null) {
		const words =
			typeof spec.words === 'string' ? { text: spec.words } : spec.words;
		const element = new Words();
		element.setText(words.text);
		if (words.fontStyle != null) {
			element.setAttribute('font-style', words.fontStyle);
		}
		if (words.fontWeight != null) {
			element.setAttribute('font-weight', words.fontWeight);
		}
		if (words.fontFamily != null) {
			element.setAttribute('font-family', words.fontFamily);
		}
		if (words.fontSize != null) {
			element.setAttribute('font-size', String(words.fontSize));
		}
		element.setJustify(words.justify ?? null);
		element.setHalign(words.halign ?? null);
		element.setValign(words.valign ?? null);
		directionType(direction).append(element);
	}
	if (spec.dynamics != null) {
		const dynamics = new Dynamics();
		for (const mark of typeof spec.dynamics === 'string'
			? [spec.dynamics]
			: spec.dynamics) {
			dynamics.append(new MElement(mark));
		}
		directionType(direction).append(dynamics);
	}
	if (direction.children.length === 0) {
		throw new Error(
			'mdom: a <direction> needs at least one of metronome, segno, coda, words or dynamics',
		);
	}
	if (spec.staff != null) {
		appendValue(direction, 'staff', spec.staff);
	}
	if (spec.tempo != null || spec.sound) {
		const sound = new Sound();
		if (spec.tempo != null) {
			sound.setAttribute('tempo', String(spec.tempo));
		}
		writeSound(sound, spec.sound ?? {});
		direction.append(sound);
	}
	return direction;
}

/** Build a detached `<direction>` for a segno, coda or jump. */
export function buildNavigation(spec: NavigationSpec): Direction {
	const placement = spec.placement ?? 'above';
	const staff = spec.staff;
	switch (spec.kind) {
		case 'segno': {
			const id = spec.id ?? 'segno';
			return buildDirection({
				segno: true,
				sound: { segno: id },
				placement,
				staff,
			});
		}
		case 'coda': {
			const id = spec.id ?? 'coda';
			return buildDirection({
				coda: true,
				sound: { coda: id },
				placement,
				staff,
			});
		}
		case 'to-coda':
			return buildDirection({
				words: spec.text ?? 'To Coda',
				sound: { toCoda: spec.id ?? 'coda' },
				placement,
				staff,
			});
		case 'da-capo':
			return buildDirection({
				words: spec.text ?? `D.C.${jumpUntil(spec.until)}`,
				sound: { daCapo: true },
				placement,
				staff,
			});
		case 'dal-segno':
			return buildDirection({
				words: spec.text ?? `D.S.${jumpUntil(spec.until)}`,
				sound: { dalSegno: spec.id ?? 'segno' },
				placement,
				staff,
			});
		case 'fine':
			return buildDirection({
				words: spec.text ?? 'Fine',
				sound: { fine: true },
				placement,
				staff,
			});
	}
}

/** The ` al Fine`/` al Coda` a D.C. or D.S. prints after itself. */
function jumpUntil(until: 'fine' | 'coda' | undefined): string {
	return until == null ? '' : ` al ${until === 'fine' ? 'Fine' : 'Coda'}`;
}

/** Append a fresh `<direction-type>` — one per printable, which is how they print side by side. */
function directionType(direction: Direction): MElement {
	const block = new MElement('direction-type');
	direction.append(block);
	return block;
}
