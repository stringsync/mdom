import { Accidental } from './accidental';
import { Articulation } from './articulation';
import { Beam } from './beam';
import { Clef } from './clef';
import { Glissando } from './glissando';
import { HammerOn } from './hammer-on';
import { Key } from './key';
import { buildLyric, Lyric, type LyricSpec } from './lyric';
import { MElement, required } from './m-node';
import { appendValue, Measure } from './measure';
import {
	buildOctaveShiftDirection,
	type OctaveShift,
	type Ottava,
} from './octave-shift';
import { Ornament } from './ornament';
import { Part } from './part';
import { Pitch, transposePitch } from './pitch';
import {
	colorOf,
	type LineType,
	type Position,
	type PositionSpec,
	placementOf,
	positionOf,
	setPositionOf,
	setYesNo,
	yesNoOf,
} from './print-style';
import { PullOff } from './pull-off';
import {
	appliesToStaff,
	attributeBackFrom,
	divisionsBackFrom,
} from './signature';
import { Slide } from './slide';
import { Slur } from './slur';
import {
	type BendShape,
	HARMONIC_KINDS,
	HARMONIC_PITCHES,
	type HarmonicKind,
	type HarmonicPitch,
	Technical,
} from './technical';
import { Tie } from './tie';
import { Time } from './time';
import {
	buildTimeModification,
	readTimeModification,
	type TimeModificationSpec,
	validateDots,
	validateTimeModification,
} from './time-modification';
import { onsetOf, repairTimelineAfter } from './timeline';
import { Transpose } from './transpose';
import { buildTuplet, Tuplet, type TupletSpec } from './tuplet';
import { WavyLine } from './wavy-line';

/** MusicXML note-type values, coarsest to finest. */
export type NoteType =
	| 'whole'
	| 'half'
	| 'quarter'
	| 'eighth'
	| '16th'
	| '32nd'
	| '64th'
	| '128th';

/**
 * A MusicXML `symbol-size`: the drawn size of a note's `<type>`. MusicXML
 * defaults it from the note: `cue` for a cue or grace note, `grace-cue` for
 * one that is both, `full` otherwise.
 */
export type SymbolSize = 'full' | 'cue' | 'grace-cue' | 'large';

/** MusicXML notehead-value enum: the glyph drawn for a note's head. */
export type NoteheadValue =
	| 'normal'
	| 'x'
	| 'diamond'
	| 'slash'
	| 'triangle'
	| 'cross'
	| 'circle-x'
	| 'none';

/** A musical duration: a note type, optional dots, and an optional onset. */
export interface DurationSpec {
	type: NoteType;
	dots?: number;
	timeModification?: TimeModificationSpec;
	/**
	 * Beat within the measure to place this at; defaults to the voice's own cursor
	 * (the end of its last note). Pass it to jump back and stack, or leave a gap.
	 */
	onset?: number;
}

/** A pitch: step, octave, and optional alteration in semitones. */
export interface PitchSpec {
	step: string;
	octave: number;
	alter?: number;
}

/** A pitched note: a {@link PitchSpec} plus a {@link DurationSpec}. */
export type NoteSpec = PitchSpec & DurationSpec;

/** Quarter-note beats per note type; dots add half of the previous increment. */
const QUARTER_BEATS: Record<NoteType, number> = {
	whole: 4,
	half: 2,
	quarter: 1,
	eighth: 0.5,
	'16th': 0.25,
	'32nd': 0.125,
	'64th': 0.0625,
	'128th': 0.03125,
};

// Fixed PPQ supports up to triple dots and ratios with factors 3, 5 and 7.
// Imported scores retain their divisions; unrepresentable durations throw.
export const WRITE_DIVISIONS = 256 * 3 * 5 * 7;

/**
 * A single note. Chords, ties, beams, slurs, voice/staff grouping, and the
 * backup/forward timeline are not stored as structure here — they round-trip as
 * plain child MElements, and the query layer derives them on demand.
 */
export class Note extends MElement {
	constructor() {
		super('note');
	}

	/** Whether this note is a `<rest>`. */
	get isRest(): boolean {
		return this.child('rest') !== null;
	}

	/** The note's pitch; null for rests / unpitched notes. */
	get pitch(): Pitch | null {
		return this.childrenOfType(Pitch)[0] ?? null;
	}

	/** The printed `<accidental>` glyph on this note (≠ pitch `alter`), or null when none is drawn. */
	get accidental(): Accidental | null {
		return this.childrenOfType(Accidental)[0] ?? null;
	}

	/** `<duration>` in divisions; null for grace notes, which carry none (see {@link isGrace}). */
	get duration(): number | null {
		const duration = this.child('duration')?.text;
		return duration == null ? null : Number(duration);
	}

	/** The notated `<type>` (whole/half/quarter/...), or null. */
	get type(): string | null {
		return this.child('type')?.text ?? null;
	}

	/** Augmentation `<dot>` count (0 when none); the read side of {@link setDuration}'s `dots`. */
	get dots(): number {
		return this.childrenNamed('dot').length;
	}

	/** The staff this note is on; '1' when omitted (single-staff parts). */
	get staff(): string {
		return this.child('staff')?.text ?? '1';
	}

	/**
	 * The `<clef>` in effect for this note's staff: the nearest one at or before
	 * this note, scanning back through the part. This single query is the whole
	 * "carried-forward signature" computation — no Signature objects, no
	 * per-fragment threading. The same backward walk answers key/time/divisions.
	 */
	get clef(): Clef | null {
		const staff = this.staff;
		return this.attributeBack(`clef:${staff}`, (attrs) =>
			attrs.childrenOfType(Clef).find((clef) => clef.staff === staff),
		);
	}

	/** `<key>` in effect for this note's staff — same backward walk as {@link clef}. */
	get key(): Key | null {
		const staff = this.staff;
		return this.attributeBack(`key:${staff}`, (attrs) =>
			attrs.childrenOfType(Key).find((key) => appliesToStaff(key, staff)),
		);
	}

	/**
	 * `<transpose>` in effect for this note's staff, a mid-measure change
	 * included: what to add to this note's written pitch to get the sounding one.
	 * Null when none has been declared (written is sounding).
	 */
	get transpose(): Transpose | null {
		const staff = this.staff;
		return this.attributeBack(`transpose:${staff}`, (attrs) =>
			attrs
				.childrenOfType(Transpose)
				.find((transpose) => appliesToStaff(transpose, staff)),
		);
	}

	/**
	 * The pitch this note sounds at: its written {@link pitch} moved by the
	 * {@link transpose} in effect, spelled by the transposition's diatonic steps,
	 * so a B♭ clarinet's written D4 sounds C4. The written pitch when nothing
	 * transposes; null for a rest or unpitched note. A clef's octave change and
	 * an `<octave-shift>` are how the notes are drawn, not what they sound, so
	 * neither is part of it.
	 */
	get soundingPitch(): Required<PitchSpec> | null {
		const pitch = this.pitch;
		if (!pitch) {
			return null;
		}
		const written = {
			step: pitch.step,
			octave: pitch.octave,
			alter: pitch.alter,
		};
		const transpose = this.transpose;
		return transpose ? transposePitch(written, transpose) : written;
	}

	/** `<time>` in effect for this note's staff. */
	get time(): Time | null {
		const staff = this.staff;
		return this.attributeBack(`time:${staff}`, (attrs) =>
			attrs.childrenOfType(Time).find((time) => appliesToStaff(time, staff)),
		);
	}

	/**
	 * `<divisions>` in effect (global, not per-staff) — needed to read
	 * `<duration>` as beats. Same backward walk, proving it generalizes.
	 */
	get divisions(): number | null {
		const measure = this.closest(Measure);
		return measure
			? divisionsBackFrom(measure, measure.children.indexOf(this))
			: null;
	}

	/** `<staves>` count in effect (global, not per-staff); 1 when never declared. */
	get staveCount(): number {
		const found = this.attributeBack(
			'staves',
			(attrs) => attrs.child('staves') ?? undefined,
		);
		return found?.text == null ? 1 : Number(found.text);
	}

	/**
	 * `<staff-details><staff-lines>` in effect for this note's staff; 5 (the
	 * musical default) when never declared.
	 */
	get staveLines(): number {
		const staff = this.staff;
		const lines = this.attributeBack(`staff-lines:${staff}`, (attrs) =>
			attrs
				.childrenNamed('staff-details')
				.filter((details) => appliesToStaff(details, staff))
				.map((details) => details.child('staff-lines'))
				.find((node) => node != null),
		);
		return lines?.text == null ? 5 : Number(lines.text);
	}

	/**
	 * Onset of this note within its measure, in quarter-note beats: a single
	 * left-to-right cursor fold (see timeline.ts), divided by divisions.
	 */
	get measureBeat(): number | null {
		const measure = this.closest(Measure);
		const divisions = this.divisions;
		if (!measure || divisions == null) {
			return null;
		}
		const onset = onsetOf(measure, this);
		return onset == null ? null : onset / divisions;
	}

	/** Duration in quarter-note beats: `<duration>` / divisions. */
	get beats(): number | null {
		const divisions = this.divisions;
		const duration = this.duration;
		if (divisions == null || duration == null) {
			return null;
		}
		return duration / divisions;
	}

	/**
	 * The `<voice>` this note belongs to; '1' when omitted, matching {@link staff}.
	 * A `<chord/>` member stacks on the note it follows and so shares its voice —
	 * exporters routinely leave `<voice>` off chord members, and bucketing those
	 * into '1' both invents a voice and collapses the orphaned run into one chord.
	 */
	get voice(): string {
		const own = this.child('voice')?.text;
		if (own != null) {
			return own;
		}
		return this.isChordMember ? (adjacentNote(this, -1)?.voice ?? '1') : '1';
	}

	/** Whether this note carries `<chord/>` (stacks on the previous note's onset). */
	get isChordMember(): boolean {
		return this.child('chord') !== null;
	}

	/** Whether this note carries `<grace/>` (stolen time, so no `<duration>`). */
	get isGrace(): boolean {
		return this.child('grace') !== null;
	}

	/**
	 * The `<slur>` markers on this note (usually one; two when a note ends one slur
	 * and begins another). Each resolves its far end via `partner`.
	 */
	get slurs(): Slur[] {
		return this.childrenNamed('notations').flatMap((notations) =>
			notations.childrenOfType(Slur),
		);
	}

	/** `<tied>` markers in `<notations>`; each resolves its far end via partner(). */
	get ties(): Tie[] {
		return this.childrenNamed('notations').flatMap((notations) =>
			notations.childrenOfType(Tie),
		);
	}

	/** `<beam>` markers (one per level) directly under the note. */
	get beams(): Beam[] {
		return this.childrenOfType(Beam);
	}

	/** `<tuplet>` markers in `<notations>`. */
	get tuplets(): Tuplet[] {
		return this.childrenNamed('notations').flatMap((notations) =>
			notations.childrenOfType(Tuplet),
		);
	}

	/** `<wavy-line>` markers in `<notations><ornaments>`. */
	get wavyLines(): WavyLine[] {
		return this.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('ornaments'))
			.flatMap((ornaments) => ornaments.childrenOfType(WavyLine));
	}

	/** `<hammer-on>` markers in `<notations><technical>`; each pairs via partner(). */
	get hammerOns(): HammerOn[] {
		return this.technicalMarkers(HammerOn);
	}

	/** `<pull-off>` markers in `<notations><technical>`; each pairs via partner(). */
	get pullOffs(): PullOff[] {
		return this.technicalMarkers(PullOff);
	}

	/** `<slide>` markers directly in `<notations>`; each pairs via partner() (crosses measures). */
	get slides(): Slide[] {
		return this.notationsMarkers(Slide);
	}

	/** `<glissando>` markers directly in `<notations>`; each pairs via partner() (crosses measures). */
	get glissandos(): Glissando[] {
		return this.notationsMarkers(Glissando);
	}

	/**
	 * Articulation marking names in `<notations><articulations>` (staccato, accent,
	 * tenuto, …), in document order — the child tags, mirroring {@link slurs}/{@link ties}.
	 */
	get articulations(): string[] {
		return this.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('articulations'))
			.flatMap((articulations) => articulations.childrenOfType(MElement))
			.map((articulation) => articulation.tag);
	}

	/**
	 * The `<notehead>` glyph, or null when the note draws the default head.
	 * `parentheses` is the `parentheses="yes"` attribute (a ghost note). `filled`
	 * is the tri-state `filled` attribute: null means unstated, so the duration
	 * decides — an explicit `filled="no"` on a quarter draws an OPEN head (a ghost
	 * or ringing note), which is not the same as saying nothing.
	 */
	get notehead(): {
		value: NoteheadValue;
		parentheses: boolean;
		filled: boolean | null;
		color: string | null;
	} | null {
		const notehead = this.child('notehead');
		if (!notehead) {
			return null;
		}
		const filled = notehead.getAttribute('filled');
		return {
			value: (notehead.text ?? 'normal') as NoteheadValue,
			parentheses: notehead.getAttribute('parentheses') === 'yes',
			filled: filled == null ? null : filled === 'yes',
			color: colorOf(notehead),
		};
	}

	/**
	 * The `<notations><fermata>` type: 'upright' (the default when the element is
	 * present without a `type`) or 'inverted'; null when there is no fermata.
	 */
	get fermata(): 'upright' | 'inverted' | null {
		const fermata = this.notationsChild('fermata');
		if (!fermata) {
			return null;
		}
		return fermata.getAttribute('type') === 'inverted' ? 'inverted' : 'upright';
	}

	/**
	 * The `<notations><fermata>` shape, its text: 'normal' (also an empty
	 * element), 'angled', 'square', and the rest of {@link FermataShape}; null
	 * when there is no fermata. An unknown shape reads as written.
	 */
	get fermataShape(): FermataShape | null {
		const fermata = this.notationsChild('fermata');
		if (!fermata) {
			return null;
		}
		const shape = fermata.text?.trim();
		return (shape ? shape : 'normal') as FermataShape;
	}

	/**
	 * The `<notations><arpeggiate>` roll: outer null = no element; inner
	 * `direction: null` = an undirected roll (element present, no `direction`
	 * attribute) — a distinct rendering, so the two nulls stay separate.
	 * `number` tells apart simultaneous rolls across the parts or staves they
	 * join; null when unstated.
	 */
	get arpeggiate(): {
		direction: 'up' | 'down' | null;
		number: number | null;
	} | null {
		const arpeggiate = this.notationsChild('arpeggiate');
		if (!arpeggiate) {
			return null;
		}
		const direction = arpeggiate.getAttribute('direction');
		return {
			direction: direction === 'up' || direction === 'down' ? direction : null,
			number: integerAttribute(arpeggiate, 'number'),
		};
	}

	/** Whether this is a slashed grace note (`<grace slash="yes"/>`, an acciaccatura). */
	get graceSlash(): boolean {
		return this.child('grace')?.getAttribute('slash') === 'yes';
	}

	/**
	 * `<grace steal-time-previous>`: the percent of the previous note's time this
	 * grace steals for its playback (a before-the-beat grace), as written (e.g. 50).
	 * Null when absent, not a finite number, or this isn't a grace note. Not clamped
	 * to 0–100; the consumer clamps.
	 */
	get graceStealTimePrevious(): number | null {
		return this.graceNumber('steal-time-previous');
	}

	/**
	 * `<grace steal-time-following>`: the percent of the following note's time this
	 * grace steals (an on-the-beat grace, as for appoggiaturas), as written. Null
	 * when absent, not a finite number, or this isn't a grace note. Not clamped to
	 * 0–100; the consumer clamps.
	 */
	get graceStealTimeFollowing(): number | null {
		return this.graceNumber('steal-time-following');
	}

	/**
	 * `<grace make-time>`: real time made for this grace rather than stolen, in
	 * quarter-note beats (make-time / divisions, as {@link beats} reads
	 * `<duration>`). Null when absent, not a finite number, no divisions are in
	 * effect, or this isn't a grace note.
	 */
	get graceMakeTime(): number | null {
		const makeTime = this.graceNumber('make-time');
		const divisions = this.divisions;
		if (makeTime == null || divisions == null) {
			return null;
		}
		return makeTime / divisions;
	}

	/** A numeric `<grace>` attribute, leniently: null unless a finite number. */
	private graceNumber(name: string): number | null {
		const raw = this.child('grace')?.getAttribute(name);
		if (raw == null || raw.trim() === '') {
			return null;
		}
		const value = Number(raw);
		return Number.isFinite(value) ? value : null;
	}

	/**
	 * `<notations><non-arpeggiate>`: the bracket marking a chord to be struck
	 * together, the opposite of {@link arpeggiate}. `type="bottom"` sits on the
	 * lowest member it covers and `type="top"` on the highest, with nothing on the
	 * members between; null when this note carries neither. A half-marked chord
	 * (only one end present — exporters emit these) reports what is there, and the
	 * consumer decides how to bracket out to the chord edge.
	 */
	get nonArpeggiate(): 'top' | 'bottom' | null {
		const type = this.notationsChild('non-arpeggiate')?.getAttribute('type');
		return type === 'top' || type === 'bottom' ? type : null;
	}

	/**
	 * The `<non-arpeggiate number>` pairing this end with its other one when
	 * several brackets overlap; null when unstated or there is none.
	 */
	get nonArpeggiateNumber(): number | null {
		const nonArpeggiate = this.notationsChild('non-arpeggiate');
		return nonArpeggiate ? integerAttribute(nonArpeggiate, 'number') : null;
	}

	/**
	 * Whether this is a cue note (`<cue/>`): printed small and not played. A cue
	 * note's duration still counts in its voice's timeline.
	 */
	get isCue(): boolean {
		return this.child('cue') !== null;
	}

	/**
	 * Every `<notations><other-notation>`, document order: a mark MusicXML has no
	 * element for. `text` is its free text, kept apart from `smufl`, the glyph
	 * name that says how it draws; `type` is 'start', 'stop' or 'single' and
	 * `number` pairs a start with its stop.
	 */
	get otherNotations(): Array<{
		type: 'start' | 'stop' | 'single';
		number: number;
		text: string;
		smufl: string | null;
		placement: 'above' | 'below' | null;
	}> {
		return this.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('other-notation'))
			.map((node) => {
				const type = node.getAttribute('type');
				return {
					type: type === 'start' || type === 'stop' ? type : 'single',
					number: integerAttribute(node, 'number') ?? 1,
					text: node.text ?? '',
					smufl: node.getAttribute('smufl'),
					placement: placementOf(node),
				};
			});
	}

	/**
	 * `<unpitched><display-step>/<display-octave>`: the staff POSITION of an
	 * unpitched (percussion) note — which line or space to draw the glyph on, not a
	 * pitch. A kick, a snare, and a hi-hat read as three different rows under one
	 * percussion clef entirely through this. Null when the note is pitched or
	 * carries no pair.
	 */
	get unpitched(): { step: string; octave: number } | null {
		return displayPosition(this.child('unpitched'));
	}

	/**
	 * The same `<display-step>`/`<display-octave>` pair on a `<rest>` — pinning a
	 * rest to a chosen line instead of the default centered one, standard in
	 * multi-voice writing. Null when the rest carries none.
	 */
	get restPosition(): { step: string; octave: number } | null {
		return displayPosition(this.child('rest'));
	}

	/**
	 * Every child across this note's `<notations><ornaments>` blocks, in document
	 * order — trills, turns, mordents, tremolos, and the `<accidental-mark>`s, so a
	 * consumer can attach each mark to the ornament it follows (a turn's pair reads
	 * one above and one below). `<wavy-line>` is a spanner and stays on
	 * {@link wavyLines}.
	 */
	get ornaments(): Ornament[] {
		return this.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('ornaments'))
			.flatMap((ornaments) => ornaments.childrenOfType(Ornament));
	}

	/**
	 * Every child across this note's `<notations><articulations>` blocks,
	 * document order, as typed marks carrying placement and position. The bare
	 * names stay on {@link articulations}.
	 */
	get articulationMarks(): Articulation[] {
		return this.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('articulations'))
			.flatMap((block) => block.childrenOfType(Articulation));
	}

	/**
	 * Every child across this note's `<notations><technical>` blocks, document
	 * order: fingerings, plucks, bowings, open strings, and the rest. The common
	 * tablature reads — {@link string}, {@link fret}, {@link bend},
	 * {@link isHarmonic} — stay on this class; `<hammer-on>`/`<pull-off>` are
	 * spanners and stay on {@link hammerOns}/{@link pullOffs}.
	 */
	get technicals(): Technical[] {
		return this.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('technical'))
			.flatMap((technical) => technical.childrenOfType(Technical));
	}

	/**
	 * The grace notes ornamenting this note, in play order: the run of `<grace/>`
	 * notes immediately preceding it in its measure. Grace notes steal no timeline
	 * time, so they never surface as an onset of their own and can't be reached
	 * through a {@link Cursor}. Empty for most notes.
	 */
	get gracesBefore(): Note[] {
		const measure = this.closest(Measure);
		if (!measure) {
			return [];
		}
		const notes = measure.notes;
		const graces: Note[] = [];
		for (
			let index = notes.indexOf(this) - 1;
			index >= 0 && notes[index]!.isGrace;
			index--
		) {
			graces.unshift(notes[index]!);
		}
		return graces;
	}

	/** The measure this note sits in. A note attached to a tree always has one. */
	get measure(): Measure {
		return required(this.closest(Measure), '<measure> ancestor of <note>');
	}

	/** The part this note belongs to. A note attached to a tree always has one. */
	get part(): Part {
		return required(this.closest(Part), '<part> ancestor of <note>');
	}

	/** Whether this note carries `<notations><technical><harmonic>`. */
	get isHarmonic(): boolean {
		return this.technicalChild('harmonic') !== null;
	}

	/**
	 * The `<notations><technical><harmonic>`: `kind` is natural or artificial (an
	 * artificial one covers pinch harmonics) and `pitch` which pitch the note is
	 * written at — the base (played) pitch, the touching pitch, or the sounding
	 * pitch. Either is null when unstated. Null when the note is no harmonic.
	 */
	get harmonic(): {
		kind: HarmonicKind | null;
		pitch: HarmonicPitch | null;
	} | null {
		const harmonic = this.technicalChild('harmonic');
		if (!harmonic) {
			return null;
		}
		const kind = HARMONIC_KINDS.find((name) => harmonic.child(name));
		const pitch = HARMONIC_PITCHES.find((name) =>
			harmonic.child(`${name}-pitch`),
		);
		return { kind: kind ?? null, pitch: pitch ?? null };
	}

	/**
	 * The bend across this note's `<notations><technical><bend>` elements:
	 * `semitones` from the first one's `<bend-alter>` (2 = whole step), `preBend`
	 * when the string is bent before it is struck, `release` when the bend is let
	 * back down. MusicXML writes a bend and release as two `<bend>`s, the second
	 * a negative release; one `<bend>` carrying `<release/>` reads the same.
	 * `withBar` (a whammy-bar `scoop` or `dip`) and `shape` come from the first
	 * `<bend>`, null when it states none; {@link Technical.bend} reads each
	 * `<bend>` in full. Null when there is no bend.
	 */
	get bend(): {
		semitones: number;
		preBend: boolean;
		release: boolean;
		withBar: string | null;
		shape: BendShape | null;
	} | null {
		const bends = this.technicalMarkers(Technical).flatMap(
			(technical) => technical.bend ?? [],
		);
		const first = bends[0];
		if (!first) {
			return null;
		}
		return {
			semitones: first.alter,
			preBend: bends.some((bend) => bend.preBend),
			release: bends.some((bend) => bend.release !== null),
			withBar: first.withBar,
			shape: first.shape,
		};
	}

	/** Text of each `<notations><technical><other-technical>` (free text like `P.M.`), document order. */
	get otherTechnical(): string[] {
		return this.technicalChildrenNamed('other-technical').map(
			(node) => node.text ?? '',
		);
	}

	/**
	 * Whether the note rings on, undamped: a `<tied type="let-ring">`, or the
	 * `let ring` text some exporters write as `<other-technical>`.
	 */
	get isLetRing(): boolean {
		return (
			this.ties.some((tie) => tie.getAttribute('type') === 'let-ring') ||
			this.otherTechnical.some((text) => LET_RING_TEXT.test(text))
		);
	}

	/**
	 * Whether the note is palm muted. MusicXML has no element for it, so it is
	 * the `<other-technical>` text `P.M.` (or a spelling such as `palm mute`).
	 */
	get isPalmMuted(): boolean {
		return this.otherTechnical.some((text) => PALM_MUTE_TEXT.test(text));
	}

	/** `<stem>` direction (splits two voices on one stave; `none`/`double` are real values too); null when absent. */
	get stem(): 'up' | 'down' | 'double' | 'none' | null {
		const direction = this.child('stem')?.text;
		return direction === 'up' ||
			direction === 'down' ||
			direction === 'double' ||
			direction === 'none'
			? direction
			: null;
	}

	/** The normalized `color` of the `<stem>`; null when unset or when there is no stem. */
	get stemColor(): string | null {
		return colorOf(this.child('stem'));
	}

	/**
	 * The normalized `color` of the note itself — the default for everything it
	 * draws, which the `<notehead>`, `<stem>`, `<beam>`, and `<lyric>` colors
	 * override individually. Null when unset.
	 */
	get color(): string | null {
		return colorOf(this);
	}

	/**
	 * Whether this note is drawn at all. `print-object="no"` holds the note's tick
	 * so the other voices stay aligned but prints nothing — exporters lean on it
	 * heavily for spacer notes, so drawing them puts noteheads on the page that
	 * shouldn't be there.
	 */
	get printObject(): boolean {
		return this.getAttribute('print-object') !== 'no';
	}

	/** Set `print-object`: false hides the note but keeps its time. */
	setPrintObject(value: boolean): void {
		setYesNo(this, 'print-object', value);
	}

	/**
	 * Whether the note's augmentation dots are drawn (`print-dot`). Unstated, it
	 * follows {@link printObject}, as MusicXML says.
	 */
	get printDot(): boolean {
		return yesNoOf(this, 'print-dot', this.printObject);
	}

	/** Set `print-dot`, or remove it with null so it follows {@link printObject}. */
	setPrintDot(value: boolean | null): void {
		setYesNo(this, 'print-dot', value);
	}

	/**
	 * Whether the note's lyrics are drawn (`print-lyric`). Unstated, it follows
	 * {@link printObject}, as MusicXML says.
	 */
	get printLyric(): boolean {
		return yesNoOf(this, 'print-lyric', this.printObject);
	}

	/** Set `print-lyric`, or remove it with null so it follows {@link printObject}. */
	setPrintLyric(value: boolean | null): void {
		setYesNo(this, 'print-lyric', value);
	}

	/**
	 * Whether a note that prints nothing still takes its horizontal space
	 * (`print-spacing`); true when unstated.
	 */
	get printSpacing(): boolean {
		return yesNoOf(this, 'print-spacing', true);
	}

	/** Set `print-spacing`, or remove it with null to restore the default. */
	setPrintSpacing(value: boolean | null): void {
		setYesNo(this, 'print-spacing', value);
	}

	/**
	 * The note's position attributes, in tenths: `defaultX` places it within
	 * the measure as the exporter laid it out. Layout only: the onset comes
	 * from the timeline, never from these.
	 */
	get position(): Position {
		return positionOf(this);
	}

	/** Replace the note's position attributes; null removes them all. */
	setPosition(spec: PositionSpec | null): void {
		setPositionOf(this, spec);
	}

	/**
	 * The `<stem>`'s position attributes, in tenths: `defaultY` is where the
	 * stem ends, relative to the top staff line. Null when there is no stem.
	 */
	get stemPosition(): Position | null {
		const stem = this.child('stem');
		return stem === null ? null : positionOf(stem);
	}

	/**
	 * Replace the `<stem>`'s position attributes; null removes them all. Throws
	 * when the note has no stem to place.
	 */
	setStemPosition(spec: PositionSpec | null): void {
		setPositionOf(required(this.child('stem'), '<stem> on <note>'), spec);
	}

	/**
	 * The `size` of the note's `<type>` as written; null when unstated (see
	 * {@link SymbolSize} for the default) or when there is no `<type>`.
	 */
	get typeSize(): SymbolSize | null {
		const size = this.child('type')?.getAttribute('size');
		return size === 'full' ||
			size === 'cue' ||
			size === 'grace-cue' ||
			size === 'large'
			? size
			: null;
	}

	/**
	 * Set the `size` of the note's `<type>`, or remove it with null. Throws
	 * when the note has no `<type>` to size.
	 */
	setTypeSize(size: SymbolSize | null): void {
		const type = this.child('type');
		if (size === null) {
			type?.removeAttribute('size');
			return;
		}
		required(type, '<type> on <note>').setAttribute('size', size);
	}

	/**
	 * The `<time-modification>` tuplet ratio (`actual-notes` : `normal-notes`, e.g.
	 * 3:2 for a triplet), or null when this note isn't time-modified.
	 */
	get timeModification() {
		return readTimeModification(this.child('time-modification'));
	}

	/** Set the cumulative performed ratio, recomputing timing without changing the written type. */
	setTimeModification(spec: TimeModificationSpec | null): void {
		const block = spec == null ? null : buildTimeModification(spec);
		const duration = this.child('duration');
		const after =
			duration == null
				? null
				: durationDivisions(
						{
							type: required(
								this.type,
								'<type> on time-modified note',
							) as NoteType,
							dots: this.dots,
							timeModification: spec ?? undefined,
						},
						required(this.divisions, 'divisions for time modification'),
					);
		const before = this.duration ?? 0;
		this.child('time-modification')?.remove();
		if (block) {
			const following = new Set([
				'stem',
				'notehead',
				'notehead-text',
				'staff',
				'beam',
				'notations',
				'lyric',
				'play',
				'listen',
			]);
			this.insertBefore(
				block,
				this.children.find(
					(child) => child instanceof MElement && following.has(child.tag),
				) ?? null,
			);
		}
		if (duration && after != null) {
			duration.setText(String(after));
			const measure = this.closest(Measure);
			if (measure) {
				repairTimelineAfter(measure, this, after - before);
			}
		}
	}

	/** Pair printed tuplet endpoints. Performed ratios are set separately on each note. */
	addTuplet(other: Note, spec: TupletSpec = {}): Tuplet {
		const number = nextNumber(this, (note) => note.tuplets);
		const start = buildTuplet('start', number, spec);
		const stop = buildTuplet('stop', number, {});
		this.notations().append(start);
		other.notations().append(stop);
		return start;
	}

	/** The `<lyric>` verses attached to this note, in document order (one per verse). */
	get lyrics(): Lyric[] {
		return this.childrenOfType(Lyric);
	}

	/** The lyric of `verse` (and `name`, when given); null when the note has none. */
	getLyric(verse = '1', name?: string): Lyric | null {
		return (
			this.lyrics.find(
				(lyric) =>
					lyric.verse === verse && (name === undefined || lyric.name === name),
			) ?? null
		);
	}

	/**
	 * Sing a syllable of one verse on this note (see {@link LyricSpec}). A note
	 * carries one lyric per verse, so this replaces any the verse (and name) has;
	 * a new verse goes in verse order among the others.
	 */
	setLyric(spec: LyricSpec): Lyric {
		const lyric = buildLyric(spec);
		const verse = spec.verse ?? '1';
		const existing = this.getLyric(verse, spec.name);
		if (existing) {
			this.replaceChild(existing, lyric);
			return lyric;
		}
		const later = this.lyrics.find(
			(other) => compareVerses(other.verse, verse) > 0,
		);
		this.insertBefore(
			lyric,
			later ??
				this.children.find(
					(child) =>
						child instanceof MElement && ['play', 'listen'].includes(child.tag),
				) ??
				null,
		);
		return lyric;
	}

	/** Remove the lyric of `verse` (and `name`, when given); a no-op when there is none. */
	removeLyric(verse = '1', name?: string): void {
		this.getLyric(verse, name)?.remove();
	}

	/** `<string>` in `<technical>`: the guitar string this note is fretted on, or null. */
	get string(): number | null {
		const value = this.technicalChild('string')?.text;
		return value == null ? null : Number(value);
	}

	/** `<fret>` in `<technical>`: where the string is stopped (0 = open), or null. */
	get fret(): number | null {
		const value = this.technicalChild('fret')?.text;
		return value == null ? null : Number(value);
	}

	/**
	 * Ids of the `<score-instrument>`s this note plays, from its `<instrument>`
	 * elements, in document order. Empty when the note names none, which
	 * MusicXML leaves to the part: its only instrument when it declares one
	 * ({@link Part.instruments}), unspecified when it declares several.
	 */
	get instrumentIds(): string[] {
		return this.childrenNamed('instrument').flatMap((node) => {
			const id = node.getAttribute('id');
			return id === null ? [] : [id];
		});
	}

	/**
	 * Assign this note to these instruments of its part, replacing any it
	 * named; an empty list removes the assignment. Throws for an id the part
	 * does not declare ({@link Part.addInstrument}).
	 */
	setInstrumentIds(ids: readonly string[]): void {
		const part = this.part;
		for (const id of ids) {
			if (part.getInstrument(id) === null) {
				throw new Error(`part "${part.id}" declares no instrument "${id}"`);
			}
		}
		for (const node of this.childrenNamed('instrument')) {
			node.remove();
		}
		const before =
			this.children.find(
				(child) => child instanceof MElement && afterInstrument.has(child.tag),
			) ?? null;
		for (const id of ids) {
			const node = new MElement('instrument');
			node.setAttribute('id', id);
			this.insertBefore(node, before);
		}
	}

	/**
	 * Add an articulation mark (staccato, accent, tenuto, …), creating
	 * `<notations><articulations>` as needed. MusicXML names the mark by its TAG,
	 * so `name` is written through as one — the write side of {@link articulations},
	 * spelled the way MusicXML spells it. `placement` pins it above or below the
	 * note; left out, the renderer chooses.
	 */
	addArticulation(
		name: string,
		options: { placement?: 'above' | 'below' } = {},
	): MElement {
		const mark = new MElement(name);
		if (options.placement != null) {
			mark.setAttribute('placement', options.placement);
		}
		this.articulationsBlock().append(mark);
		return mark;
	}

	/**
	 * Set or clear the fermata on this note ('upright' or 'inverted'); null
	 * removes it. `shape` writes a {@link FermataShape} other than the default
	 * normal one. The write side of {@link fermata} and {@link fermataShape}.
	 */
	setFermata(type: 'upright' | 'inverted' | null, shape?: FermataShape): void {
		for (const notations of this.childrenNamed('notations')) {
			for (const node of notations.childrenNamed('fermata')) {
				node.remove();
			}
		}
		if (type) {
			const fermata = new MElement('fermata');
			fermata.setAttribute('type', type);
			if (shape != null && shape !== 'normal') {
				fermata.setText(shape);
			}
			this.notations().append(fermata);
		}
	}

	/**
	 * Set or clear the arpeggio roll on this note. `{ direction }` rolls up or
	 * down (a Guitar Pro brush); `{ direction: null }` is a plain wavy roll; null
	 * removes it. `number` groups rolls struck together across staves or parts.
	 * The write side of {@link arpeggiate}.
	 */
	setArpeggiate(
		spec: { direction: 'up' | 'down' | null; number?: number } | null,
	): void {
		for (const notations of this.childrenNamed('notations')) {
			for (const node of notations.childrenNamed('arpeggiate')) {
				node.remove();
			}
		}
		if (spec) {
			const arpeggiate = new MElement('arpeggiate');
			if (spec.direction) {
				arpeggiate.setAttribute('direction', spec.direction);
			}
			if (spec.number != null) {
				arpeggiate.setAttribute('number', String(spec.number));
			}
			this.notations().append(arpeggiate);
		}
	}

	/**
	 * Set or clear a single-note tremolo with `marks` slashes (1-8, tremolo
	 * picking); null removes it. The write side of the `tremolo` {@link ornaments}
	 * entry.
	 */
	setTremolo(marks: number | null): void {
		for (const ornament of this.ornaments) {
			if (ornament.tag === 'tremolo') {
				ornament.remove();
			}
		}
		if (marks == null) {
			return;
		}
		if (!Number.isInteger(marks) || marks < 0 || marks > 8) {
			throw new Error(
				`mdom: tremolo marks must be an integer 0-8, got ${marks}`,
			);
		}
		const tremolo = new Ornament('tremolo');
		tremolo.setAttribute('type', 'single');
		tremolo.setText(String(marks));
		const notations = this.notations();
		let block = notations.childrenNamed('ornaments')[0];
		if (!block) {
			block = new MElement('ornaments');
			notations.append(block);
		}
		// <tremolo> leads the ornament sequence, ahead of any accidental-marks.
		block.insertBefore(tremolo, block.children[0] ?? null);
	}

	/**
	 * Span an ottava from this note through `other` (8va, 8vb, 15ma, …): mdom adds
	 * the start `<direction>` before this note's chord and the stop after
	 * `other`'s, with an unused number, on this note's staff.
	 */
	addOctaveShift(other: Note, ottava: Ottava): OctaveShift {
		const part = this.closest(Part);
		const used = new Set(
			(part?.measures ?? []).flatMap((measure) =>
				measure.directions.flatMap((direction) =>
					direction.octaveShifts.map((shift) => shift.number),
				),
			),
		);
		let number = 1;
		while (used.has(String(number))) {
			number++;
		}
		const start = buildOctaveShiftDirection(ottava, String(number), this.staff);
		const stop = buildOctaveShiftDirection(null, String(number), this.staff);
		const first = this.chordLead();
		first.parent?.insertBefore(start, first);
		const last = other.chordTail();
		const siblings = last.parent?.children ?? [];
		last.parent?.insertBefore(
			stop,
			siblings[siblings.indexOf(last) + 1] ?? null,
		);
		return start.octaveShifts[0]!;
	}

	/** First note of the `<chord/>` stack this note belongs to. */
	private chordLead(): Note {
		const siblings = this.parent?.children ?? [];
		let index = siblings.indexOf(this);
		while (index > 0 && (siblings[index] as Note).isChordMember) {
			index--;
		}
		return siblings[index] as Note;
	}

	/** Last note of the `<chord/>` stack this note belongs to. */
	private chordTail(): Note {
		const siblings = this.parent?.children ?? [];
		let index = siblings.indexOf(this);
		for (;;) {
			const next = siblings[index + 1];
			if (next instanceof Note && next.isChordMember) {
				index++;
			} else {
				return siblings[index] as Note;
			}
		}
	}

	/**
	 * Slur this note to `other`: mdom picks an unused slur number and adds the
	 * paired `<slur start>`/`<slur stop>` markers (creating `<notations>` as needed).
	 */
	addSlur(other: Note): Slur {
		return this.spanTo(other, Slur, (note) => note.slurs);
	}

	/** Tie this note to `other`, added as paired `<tied start>`/`<tied stop>` markers. */
	addTie(other: Note): Tie {
		return this.spanTo(other, Tie, (note) => note.ties);
	}

	/**
	 * Remove the tie between this note and `other`, detaching both `<tied>` markers
	 * so neither end dangles. Works in either direction and is a no-op when they
	 * aren't tied. The inverse of {@link addTie}; to drop an unpaired (let-ring) tie,
	 * call {@link Tie.unlink} on the marker itself.
	 */
	removeTie(other: Note): void {
		this.ties.find((tie) => tie.partner?.note === other)?.unlink();
	}

	/** Slide this note to `other` (a fretboard slide), with an optional `line-type` stroke. */
	addSlide(other: Note, spec: { lineType?: LineType } = {}): Slide {
		return this.spanTo(other, Slide, (note) => note.slides, spec.lineType);
	}

	/** Remove the slide between this note and `other`, either direction; no-op when none. */
	removeSlide(other: Note): void {
		this.slides.find((slide) => slide.partner?.note === other)?.unlink();
	}

	/** Glissando from this note to `other`, with an optional `line-type` stroke. */
	addGlissando(other: Note, spec: { lineType?: LineType } = {}): Glissando {
		return this.spanTo(
			other,
			Glissando,
			(note) => note.glissandos,
			spec.lineType,
		);
	}

	/** Remove the glissando between this note and `other`, either direction; no-op when none. */
	removeGlissando(other: Note): void {
		this.glissandos
			.find((glissando) => glissando.partner?.note === other)
			?.unlink();
	}

	/** Hammer on from this note to `other`; the start carries the conventional "H" text. */
	addHammerOn(other: Note): HammerOn {
		const start = this.spanTo(
			other,
			HammerOn,
			(note) => note.hammerOns,
			undefined,
			'technical',
		);
		start.setText('H');
		return start;
	}

	/** Remove the hammer-on between this note and `other`, either direction; no-op when none. */
	removeHammerOn(other: Note): void {
		this.hammerOns.find((marker) => marker.partner?.note === other)?.unlink();
	}

	/** Pull off from this note to `other`; the start carries the conventional "P" text. */
	addPullOff(other: Note): PullOff {
		const start = this.spanTo(
			other,
			PullOff,
			(note) => note.pullOffs,
			undefined,
			'technical',
		);
		start.setText('P');
		return start;
	}

	/** Remove the pull-off between this note and `other`, either direction; no-op when none. */
	removePullOff(other: Note): void {
		this.pullOffs.find((marker) => marker.partner?.note === other)?.unlink();
	}

	/**
	 * Vibrato as a wavy line from this note to `other`; pass the same note for a
	 * vibrato over one note. Placed in `<notations><ornaments>`.
	 */
	addVibrato(other: Note): WavyLine {
		return this.spanTo(
			other,
			WavyLine,
			(note) => note.wavyLines,
			undefined,
			'ornaments',
		);
	}

	/** Remove the vibrato from this note to `other`, either direction; no-op when none. */
	removeVibrato(other: Note): void {
		this.wavyLines.find((line) => line.partner?.note === other)?.unlink();
	}

	/**
	 * Replace this note's pitch in place (or give a rest one). The duration is
	 * unchanged, so the timeline doesn't move and any attached slur/tie/beam — which
	 * a remove-and-re-add would orphan — stays bound to this same note.
	 */
	setPitch(spec: PitchSpec): void {
		const replacement = buildPitch(spec);
		const existing =
			this.child('pitch') ?? this.child('rest') ?? this.child('unpitched');
		if (existing) {
			this.replaceChild(existing, replacement);
		} else {
			this.insertBefore(
				replacement,
				this.child('duration') ?? this.child('voice'),
			);
		}
	}

	/**
	 * Silence this note: turn it into a `<rest>` of the same duration. The slot's
	 * time survives, so the measure stays balanced — the "delete but keep the beat"
	 * an editor's Delete key usually means (vs raw {@link remove}, which closes the gap).
	 */
	convertToRest(): void {
		const pitched = this.child('pitch') ?? this.child('unpitched');
		if (pitched) {
			this.replaceChild(pitched, new MElement('rest'));
		}
	}

	/**
	 * Turn this note into a grace note: prepend `<grace/>` and drop its `<duration>`
	 * (grace notes carry none). The time it gives up is absorbed by the next note in
	 * its voice; a sibling voice is held in place by shrinking the handoff `<backup>`.
	 */
	convertToGrace(): void {
		if (this.isGrace) {
			return;
		}
		const measure = this.closest(Measure);
		const stolen = this.duration ?? 0;
		this.insertBefore(new MElement('grace'), this.children[0] ?? null);
		this.child('duration')?.remove();
		if (measure) {
			repairTimelineAfter(measure, this, -stolen);
		}
	}

	/**
	 * Place this note on a guitar string at a fret — the core of tablature,
	 * `<notations><technical><string>/<fret>`. Upserts both (creating
	 * `<notations>`/`<technical>` as needed), leaving pitch and timeline alone: a
	 * tab note carries its sounding pitch *and* where it's fretted.
	 */
	setStringFret(spec: { string: number; fret: number }): void {
		this.upsertTechnical('string', spec.string);
		this.upsertTechnical('fret', spec.fret);
	}

	/**
	 * Set or clear this note's bend; null removes every `<bend>`. `semitones` is
	 * how far the string is bent (2 = whole step, 0.5 = quarter tone). `preBend`
	 * bends it before it is struck; `release` lets it back down, written as a
	 * second `<bend>` with the negative alter MusicXML gives a release. `withBar`
	 * marks a whammy-bar bend (`scoop`, `dip`) and `shape` draws the line angled
	 * or curved. The write side of {@link bend}.
	 */
	setBend(
		spec: {
			semitones: number;
			preBend?: boolean;
			release?: boolean;
			withBar?: string;
			shape?: BendShape;
		} | null,
	): void {
		for (const bend of this.technicalChildrenNamed('bend')) {
			bend.remove();
		}
		if (!spec) {
			return;
		}
		if (!Number.isFinite(spec.semitones) || spec.semitones === 0) {
			throw new Error(
				`mdom: bend semitones must be a nonzero number, got ${spec.semitones}`,
			);
		}
		const technical = this.technical();
		const bend = new Technical('bend');
		appendValue(bend, 'bend-alter', String(spec.semitones));
		if (spec.preBend) {
			bend.append(new MElement('pre-bend'));
		}
		if (spec.withBar != null) {
			appendValue(bend, 'with-bar', spec.withBar);
		}
		if (spec.shape != null) {
			bend.setAttribute('shape', spec.shape);
		}
		technical.append(bend);
		if (spec.release) {
			const release = new Technical('bend');
			appendValue(release, 'bend-alter', String(-spec.semitones));
			release.append(new MElement('release'));
			if (spec.shape != null) {
				release.setAttribute('shape', spec.shape);
			}
			technical.append(release);
		}
	}

	/**
	 * Set or clear this note's harmonic; null removes it. `kind` natural or
	 * artificial (pinch harmonics are artificial), `pitch` which pitch the note
	 * is written at: base (played), touching, or sounding. Leave either out to
	 * leave it unstated. The write side of {@link harmonic}.
	 */
	setHarmonic(
		spec: { kind?: HarmonicKind; pitch?: HarmonicPitch } | null,
	): void {
		for (const harmonic of this.technicalChildrenNamed('harmonic')) {
			harmonic.remove();
		}
		if (!spec) {
			return;
		}
		const harmonic = new Technical('harmonic');
		if (spec.kind) {
			harmonic.append(new MElement(spec.kind));
		}
		if (spec.pitch) {
			harmonic.append(new MElement(`${spec.pitch}-pitch`));
		}
		this.technical().append(harmonic);
	}

	/**
	 * Set or clear the `<notehead>`; null draws the default head. A dead (muted)
	 * note is `{ value: 'x' }`, a ghost note `{ parentheses: true }`, and the two
	 * combine. `value` defaults to `normal`; `filled` left out lets the duration
	 * decide. The write side of {@link notehead}, whose `color` it keeps.
	 */
	setNotehead(
		spec: {
			value?: NoteheadValue;
			parentheses?: boolean;
			filled?: boolean;
		} | null,
	): void {
		const existing = this.child('notehead');
		if (!spec) {
			existing?.remove();
			return;
		}
		const notehead = new MElement('notehead');
		const color = existing?.getAttribute('color');
		if (spec.filled != null) {
			notehead.setAttribute('filled', spec.filled ? 'yes' : 'no');
		}
		if (spec.parentheses) {
			notehead.setAttribute('parentheses', 'yes');
		}
		if (color) {
			notehead.setAttribute('color', color);
		}
		notehead.setText(spec.value ?? 'normal');
		if (existing) {
			this.replaceChild(existing, notehead);
		} else {
			this.insertBefore(
				notehead,
				this.children.find(
					(child) => child instanceof MElement && AFTER_NOTEHEAD.has(child.tag),
				) ?? null,
			);
		}
	}

	/**
	 * Let this note ring on, undamped, or damp it again: a `<tied
	 * type="let-ring">`, the schema's own mark for it. Turning it off also drops
	 * any `let ring` text {@link isLetRing} reads. The write side of {@link isLetRing}.
	 */
	setLetRing(value: boolean): void {
		if (value === this.isLetRing) {
			return;
		}
		if (value) {
			const tie = new Tie();
			tie.setAttribute('type', 'let-ring');
			this.notations().append(tie);
			return;
		}
		for (const tie of this.ties) {
			if (tie.getAttribute('type') === 'let-ring') {
				tie.unlink();
			}
		}
		this.removeOtherTechnical(LET_RING_TEXT);
	}

	/**
	 * Palm mute this note or lift it: `<other-technical>P.M.</other-technical>`,
	 * since MusicXML has no element for it. Turning it off drops every spelling
	 * {@link isPalmMuted} reads. The write side of {@link isPalmMuted}.
	 */
	setPalmMuted(value: boolean): void {
		if (value === this.isPalmMuted) {
			return;
		}
		if (value) {
			const palmMute = new Technical('other-technical');
			palmMute.setText('P.M.');
			this.technical().append(palmMute);
			return;
		}
		this.removeOtherTechnical(PALM_MUTE_TEXT);
	}

	/**
	 * Change this note's notated duration (`type` + `dots`), recomputing `<duration>`
	 * from the divisions in effect and rippling the rest of its voice. A sibling
	 * voice is kept anchored by adjusting the `<backup>` between them.
	 */
	setDuration(spec: { type: NoteType; dots?: number }): void {
		validateDots(spec.dots);
		const durationNode = this.child('duration');
		if (durationNode === null) {
			this.child('type')?.setText(spec.type);
			this.refreshDots(spec.dots ?? 0);
			return; // a grace note carries no <duration>; only the notation changed
		}
		const divisions = required(
			this.divisions,
			'divisions to recompute <duration>',
		);
		const before = Number(durationNode.text ?? 0);
		const after = durationDivisions(
			{ ...spec, timeModification: this.timeModification ?? undefined },
			divisions,
		);
		this.child('type')?.setText(spec.type);
		this.refreshDots(spec.dots ?? 0);
		durationNode.setText(String(after));
		const measure = this.closest(Measure);
		if (measure) {
			repairTimelineAfter(measure, this, after - before);
		}
	}

	/** Replace this note's `<dot>` run with `count` dots, positioned just after `<type>`. */
	private refreshDots(count: number): void {
		for (const dot of this.childrenNamed('dot')) {
			dot.remove();
		}
		const type = this.child('type');
		const afterType = type
			? (this.children[this.children.indexOf(type) + 1] ?? null)
			: null;
		for (let index = 0; index < count; index++) {
			this.insertBefore(new MElement('dot'), afterType);
		}
	}

	/**
	 * First `<attributes>` back from this note (nearest first) for which `pick`
	 * returns a match — the shared shape of every carry-forward query.
	 */
	private attributeBack<T>(
		key: string,
		pick: (attrs: MElement) => T | null | undefined,
	): T | null {
		const measure = this.closest(Measure);
		return measure
			? attributeBackFrom(measure, measure.children.indexOf(this), key, pick)
			: null;
	}

	/**
	 * Add a note-attached spanner from this note to `other`, picking an unused
	 * number across the part so the caller never manages pairing keys.
	 */
	private spanTo<T extends MElement & { number: string }>(
		other: Note,
		Marker: new () => T,
		existing: (note: Note) => T[],
		lineType?: LineType,
		block?: 'technical' | 'ornaments',
	): T {
		const number = nextNumber(this, existing);
		const start = new Marker();
		start.setAttribute('type', 'start');
		start.setAttribute('number', number);
		if (lineType !== undefined) {
			start.setAttribute('line-type', lineType);
		}
		this.blockOf(block).append(start);

		const stop = new Marker();
		stop.setAttribute('type', 'stop');
		stop.setAttribute('number', number);
		other.blockOf(block).append(stop);

		return start;
	}

	/** The `<notations>` child markers of this kind live under: itself, or a technical/ornaments block. */
	private blockOf(block?: 'technical' | 'ornaments'): MElement {
		if (block === 'technical') {
			return this.technical();
		}
		if (block === 'ornaments') {
			const notations = this.notations();
			const existing = notations.childrenNamed('ornaments')[0];
			if (existing) {
				return existing;
			}
			const ornaments = new MElement('ornaments');
			notations.append(ornaments);
			return ornaments;
		}
		return this.notations();
	}

	/** Get or create this note's `<notations>` child. */
	private notations(): MElement {
		const existing = this.childrenNamed('notations')[0];
		if (existing) {
			return existing;
		}
		const notations = new MElement('notations');
		this.insertBefore(
			notations,
			this.children.find(
				(child) =>
					child instanceof MElement &&
					['lyric', 'play', 'listen'].includes(child.tag),
			) ?? null,
		);
		return notations;
	}

	/** Get or create this note's `<notations><articulations>` child. */
	private articulationsBlock(): MElement {
		const notations = this.notations();
		const existing = notations.childrenNamed('articulations')[0];
		if (existing) {
			return existing;
		}
		const articulations = new MElement('articulations');
		notations.append(articulations);
		return articulations;
	}

	/** First direct `<tag>` child across this note's `<notations>` blocks, or null. */
	private notationsChild(tag: string): MElement | null {
		return (
			this.childrenNamed('notations').flatMap((notations) =>
				notations.childrenNamed(tag),
			)[0] ?? null
		);
	}

	/** Typed markers directly under this note's `<notations>` (e.g. slides, glissandos). */
	private notationsMarkers<T extends MElement>(type: new () => T): T[] {
		return this.childrenNamed('notations').flatMap((notations) =>
			notations.childrenOfType(type),
		);
	}

	/** First `<tag>` inside this note's `<notations><technical>`, or null. */
	private technicalChild(tag: string): MElement | null {
		return this.technicalChildrenNamed(tag)[0] ?? null;
	}

	/** Every `<tag>` inside this note's `<notations><technical>` blocks, document order. */
	private technicalChildrenNamed(tag: string): MElement[] {
		return this.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('technical'))
			.flatMap((technical) => technical.childrenNamed(tag));
	}

	/** Typed markers inside this note's `<notations><technical>` (e.g. hammer-ons, pull-offs). */
	private technicalMarkers<T extends MElement>(
		type: new (...args: never[]) => T,
	): T[] {
		return this.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('technical'))
			.flatMap((technical) => technical.childrenOfType(type));
	}

	/** Get or create this note's `<notations><technical>` child. */
	private technical(): MElement {
		const notations = this.notations();
		const existing = notations.childrenNamed('technical')[0];
		if (existing) {
			return existing;
		}
		const technical = new MElement('technical');
		notations.append(technical);
		return technical;
	}

	/** Remove each `<other-technical>` whose text matches `pattern`. */
	private removeOtherTechnical(pattern: RegExp): void {
		for (const node of this.technicalChildrenNamed('other-technical')) {
			if (pattern.test(node.text ?? '')) {
				node.remove();
			}
		}
	}

	/** Set (or create) a numeric `<tag>` inside this note's `<technical>` block. */
	private upsertTechnical(tag: string, value: number): void {
		const technical = this.technical();
		const existing = technical.child(tag);
		if (existing) {
			existing.setText(String(value));
		} else {
			appendValue(technical, tag, String(value));
		}
	}
}

/** Order verses as numbers when both are, so verse 10 follows verse 9. */
function compareVerses(left: string, right: string): number {
	const leftNumber = Number(left);
	const rightNumber = Number(right);
	return Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
		? leftNumber - rightNumber
		: left.localeCompare(right);
}

/**
 * The shape of a fermata, its text in MusicXML 4.0. 'normal' is the usual arc;
 * the angled and square ones ask for shorter and longer holds.
 */
export type FermataShape =
	| 'normal'
	| 'angled'
	| 'square'
	| 'double-angled'
	| 'double-square'
	| 'double-dot'
	| 'half-curve'
	| 'curlew';

/** A whole-number attribute, leniently: null unless an integer. */
function integerAttribute(element: MElement, name: string): number | null {
	const raw = element.getAttribute(name);
	if (raw == null || raw.trim() === '') {
		return null;
	}
	const value = Number(raw);
	return Number.isInteger(value) ? value : null;
}

/** `<other-technical>` text read as let ring: `let ring`, `let-ring`, `l.r.`. */
const LET_RING_TEXT = /^\s*(let[\s-]*ring|l\.\s*r\.?)\s*$/i;

/** `<other-technical>` text read as palm mute: `P.M.`, `PM`, `palm mute(d)`. */
const PALM_MUTE_TEXT = /^\s*(p\.?\s*m\.?|palm[\s-]*mut(e|ed|ing))\s*$/i;

/** `<note>` children the schema puts after `<notehead>`. */
const AFTER_NOTEHEAD = new Set([
	'notehead-text',
	'staff',
	'beam',
	'notations',
	'lyric',
	'play',
	'listen',
]);

/** `<note>` children the schema puts after `<instrument>`. */
const afterInstrument = new Set([
	'footnote',
	'level',
	'voice',
	'type',
	'dot',
	'accidental',
	'time-modification',
	'stem',
	'notehead',
	'notehead-text',
	'staff',
	'beam',
	'notations',
	'lyric',
	'play',
	'listen',
]);

/**
 * The lowest spanner number not already used by markers of this kind anywhere in
 * the part, so a generated start/stop pair can't collide with an existing span.
 */
function nextNumber(
	note: Note,
	existing: (note: Note) => { number: string }[],
): string {
	const part = note.closest(Part);
	const used = new Set<string>();
	if (part) {
		for (const measure of part.measures) {
			for (const sibling of measure.notes) {
				for (const marker of existing(sibling)) {
					used.add(marker.number);
				}
			}
		}
	}
	let candidate = 1;
	while (used.has(String(candidate))) {
		candidate++;
	}
	return String(candidate);
}

/**
 * `<duration>` in divisions for a musical type + dots. `<duration>` must be an
 * integer; with WRITE_DIVISIONS this holds for every type down to a 128th with
 * up to triple dots. Anything finer throws loudly rather than emit invalid XML.
 */
export function durationDivisions(
	spec: DurationSpec,
	divisions: number,
): number {
	validateDots(spec.dots);
	let increment = QUARTER_BEATS[spec.type] * divisions;
	let total = increment;
	for (let dot = 0; dot < (spec.dots ?? 0); dot++) {
		increment /= 2;
		total += increment;
	}
	if (spec.timeModification) {
		validateTimeModification(spec.timeModification);
		total =
			(total * spec.timeModification.normal) / spec.timeModification.actual;
	}
	if (!Number.isSafeInteger(total)) {
		throw new Error(
			`cannot represent ${spec.dots ?? 0}-dotted "${spec.type}" at divisions ${divisions}: fractional duration ${total}`,
		);
	}
	return total;
}

/**
 * The nearest non-`<chord/>`-member {@link Note} sibling of `element` in the same
 * measure, walking document order (`step` = 1 forward, -1 backward). Directions
 * and harmonies sit between notes and bind to a neighbor — a pedal start to the
 * note that follows, a chord symbol to the note it sits above.
 */
export function adjacentNote(element: MElement, step: 1 | -1): Note | null {
	const measure = element.closest(Measure);
	if (!measure) {
		return null;
	}
	const siblings = measure.children;
	for (
		let index = siblings.indexOf(element) + step;
		index >= 0 && index < siblings.length;
		index += step
	) {
		const node = siblings[index];
		if (node instanceof Note && !node.isChordMember) {
			return node;
		}
	}
	return null;
}

/**
 * The `<display-step>`/`<display-octave>` pair inside a `<rest>` or `<unpitched>`
 * — a staff position, not a pitch. Null when the element or either half is absent.
 */
function displayPosition(
	element: MElement | null,
): { step: string; octave: number } | null {
	const step = element?.child('display-step')?.text;
	const octave = element?.child('display-octave')?.text;
	if (step == null || octave == null) {
		return null;
	}
	return { step, octave: Number(octave) };
}

/** Build a `<pitch>` from a {@link PitchSpec}. */
export function buildPitch(spec: PitchSpec): Pitch {
	const pitch = new Pitch();
	appendValue(pitch, 'step', spec.step);
	if (spec.alter != null) {
		appendValue(pitch, 'alter', String(spec.alter));
	}
	appendValue(pitch, 'octave', String(spec.octave));
	return pitch;
}
