import { buildFrame, Frame, type FrameSpec } from './frame';
import { MElement, required } from './m-node';
import { appendValue, Measure } from './measure';
import { adjacentNote, type Note } from './note';
import { type Offset, type OffsetSpec, offsetOf, writeOffset } from './offset';
import { placementOf, setYesNo, yesNoOf } from './print-style';
import { divisionsBackFrom } from './signature';
import {
	setOrRemove,
	type TextAlign,
	type TextVerticalAlign,
	textAlignOf,
	verticalAlignOf,
} from './text-format';
import { onsetOf } from './timeline';

/**
 * The MusicXML kind-value enum: the harmonic quality printed for a chord symbol.
 * A closed union, not `string` — a renderer switches on it exhaustively.
 */
export type HarmonyKindValue =
	| 'major'
	| 'minor'
	| 'augmented'
	| 'diminished'
	| 'dominant'
	| 'major-seventh'
	| 'minor-seventh'
	| 'diminished-seventh'
	| 'augmented-seventh'
	| 'half-diminished'
	| 'major-minor'
	| 'major-sixth'
	| 'minor-sixth'
	| 'dominant-ninth'
	| 'major-ninth'
	| 'minor-ninth'
	| 'dominant-11th'
	| 'major-11th'
	| 'minor-11th'
	| 'dominant-13th'
	| 'major-13th'
	| 'minor-13th'
	| 'suspended-second'
	| 'suspended-fourth'
	| 'Neapolitan'
	| 'Italian'
	| 'French'
	| 'German'
	| 'pedal'
	| 'power'
	| 'Tristan'
	| 'other'
	| 'none';

/** A `<root>`/`<bass>` scale degree: a step plus an explicit alteration (or none). */
export interface HarmonyStep {
	step: string;
	/**
	 * `<root-alter>`/`<bass-alter>` in semitones, or null when absent. An explicit
	 * `0` (print a natural) stays distinct from absence — hence `number | null`,
	 * not a default of 0.
	 */
	alter: number | null;
	/** The step's `text` attribute: how to print it in place of the letter; null when unstated. */
	text: string | null;
}

/** How stacked chords, or a bass under its chord, are laid out (`arrangement`). */
export type HarmonyArrangement = 'vertical' | 'horizontal' | 'diagonal';

/** A slash-chord `<bass>`: its step, plus the separator and layout it prints with. */
export interface HarmonyBass extends HarmonyStep {
	/** `<bass-separator>`: what is printed between chord and bass (`/`); null when unstated. */
	separator: string | null;
	/** `arrangement` of the bass against the chord; null when unstated. */
	arrangement: HarmonyArrangement | null;
}

/** A `<root>`/`<bass>` to write. `alter` is omitted rather than 0 when there is none. */
export interface HarmonyStepSpec {
	step: string;
	alter?: number;
	text?: string;
}

/** A `<bass>` to write. */
export interface HarmonyBassSpec extends HarmonyStepSpec {
	separator?: string;
	arrangement?: HarmonyArrangement;
}

/** The chord quality from `<kind>`, with the formatting it states. */
export interface HarmonyKind {
	value: HarmonyKindValue;
	/** The printed suffix in place of the renderer's default; null when unstated. */
	text: string | null;
	/** `use-symbols`: print triangle/minus/plus/circle symbols; null when unstated (implementation-specific). */
	useSymbols: boolean | null;
	/** `stack-degrees`: stack the degrees above each other; null when unstated. */
	stackDegrees: boolean | null;
	/** `parentheses-degrees`: put the degrees in parentheses; null when unstated. */
	parenthesesDegrees: boolean | null;
	/** `bracket-degrees`: put the degrees in a bracket; null when unstated. */
	bracketDegrees: boolean | null;
	/** `halign` of the whole chord symbol; null when unstated. */
	halign: TextAlign | null;
	/** `valign` of the whole chord symbol; null when unstated. */
	valign: TextVerticalAlign | null;
}

/** A `<kind>` to write: the bare value, or the value with its formatting. */
export type HarmonyKindSpec =
	| HarmonyKindValue
	| {
			value: HarmonyKindValue;
			/** Override what is printed (`'maj7'` for a `major-seventh`). */
			text?: string;
			useSymbols?: boolean;
			stackDegrees?: boolean;
			parenthesesDegrees?: boolean;
			bracketDegrees?: boolean;
			halign?: TextAlign;
			valign?: TextVerticalAlign;
	  };

/** What a `<degree>` does to the chord its kind implies. */
export type HarmonyDegreeType = 'add' | 'alter' | 'subtract';

/** The `symbol` a `<degree-value>` prints with, in place of a number. */
export type HarmonyDegreeSymbol =
	| 'major'
	| 'minor'
	| 'augmented'
	| 'diminished'
	| 'half-diminished';

/**
 * A `<degree>`: one added, altered or subtracted chord tone, such as the ♭9 of
 * a `7(♭9)`. A chord's degrees keep their document order, repeats included.
 */
export interface HarmonyDegree {
	/** `<degree-value>`: the scale degree, 9 for a ninth. */
	value: number;
	/**
	 * `<degree-alter>` in semitones. The element is required, so `0` is a stated
	 * natural (the usual value for a `subtract` or a plain `add`), not absence.
	 */
	alter: number;
	type: HarmonyDegreeType;
	/** `<degree-value symbol>`; null when unstated. */
	symbol: HarmonyDegreeSymbol | null;
	/** `<degree-value text>`: how to print the degree; null when unstated. */
	text: string | null;
	/** `<degree-type text>`: how to print the type (`'no'` for subtract); null when unstated. */
	typeText: string | null;
	/** `<degree-alter plus-minus>`: print the alteration as +/- rather than ♯/♭; false when unstated. */
	plusMinus: boolean;
	/** Whether the degree is printed (`print-object`); true when unstated. */
	printObject: boolean;
}

/** A `<degree>` to write. `alter` defaults to 0, which is still written: the element is required. */
export interface HarmonyDegreeSpec {
	value: number;
	type: HarmonyDegreeType;
	alter?: number;
	symbol?: HarmonyDegreeSymbol;
	text?: string;
	typeText?: string;
	plusMinus?: boolean;
	printObject?: boolean;
}

/** A `<numeral>` key: what the numeral is relative to. */
export type HarmonyNumeralMode =
	| 'major'
	| 'minor'
	| 'natural minor'
	| 'melodic minor'
	| 'harmonic minor';

/** A `<numeral-key>`: the key a Roman numeral or Nashville number is read in. */
export interface HarmonyNumeralKey {
	/** `<numeral-fifths>`: sharps (positive) or flats (negative) of the key. */
	fifths: number;
	mode: HarmonyNumeralMode;
	/** Whether the key is printed (`print-object`); true when unstated. */
	printObject: boolean;
}

/**
 * A `<numeral>` root: a Roman numeral or Nashville number, the scale degree
 * 1–7 the chord is built on, in place of a letter `<root>`.
 */
export interface HarmonyNumeral {
	/** `<numeral-root>`: the scale degree, 1 to 7. */
	root: number;
	/** `<numeral-root text>`: `'V'` or `'5'`; null when unstated (the display is the renderer's). */
	text: string | null;
	/** `<numeral-alter>` in semitones; null when absent, an explicit 0 kept distinct. */
	alter: number | null;
	/** `<numeral-key>`; null when the numeral states none and follows the key signature. */
	key: HarmonyNumeralKey | null;
}

/** A `<numeral>` to write. */
export interface HarmonyNumeralSpec {
	root: number;
	text?: string;
	alter?: number;
	key?: { fifths: number; mode: HarmonyNumeralMode; printObject?: boolean };
}

/** A `<inversion>`: 0 for root position, 1 for first inversion, and so on. */
export interface HarmonyInversion {
	value: number;
	/** How to print the inversion; null when unstated. */
	text: string | null;
}

/**
 * One chord of a `<harmony>`: what it is built on, its quality, and its
 * inversion, bass and degrees. A harmony usually holds one; a polychord holds
 * several, stacked in document order.
 *
 * Exactly one of {@link root}, {@link numeral} and {@link function} is set in a
 * valid document: a letter root, a Roman numeral or Nashville number, or the
 * pre-4.0 `<function>` text.
 */
export interface HarmonyChord {
	root: HarmonyStep | null;
	numeral: HarmonyNumeral | null;
	/** `<function>`: a Roman numeral as plain text (`'V7'`), deprecated in MusicXML 4.0 for {@link numeral}. */
	function: string | null;
	/** The chord quality; null only in a malformed chord that states none. */
	kind: HarmonyKind | null;
	inversion: HarmonyInversion | null;
	bass: HarmonyBass | null;
	degrees: HarmonyDegree[];
}

/** What a chord to write is built on: exactly one of a root, a numeral or a function. */
type HarmonyChordBase =
	| { root: HarmonyStepSpec; numeral?: never; function?: never }
	| { numeral: HarmonyNumeralSpec; root?: never; function?: never }
	| { function: string; root?: never; numeral?: never };

/** One chord of a `<harmony>` to write. */
export type HarmonyChordSpec = HarmonyChordBase & {
	/**
	 * `<kind>`. The bare enum value prints the renderer's default suffix; pass
	 * `text` to override what is printed (`'maj7'` for a `major-seventh`).
	 */
	kind: HarmonyKindSpec;
	inversion?: number | { value: number; text?: string };
	bass?: HarmonyBassSpec;
	/** Degrees in the order they print; repeats are kept. */
	degrees?: HarmonyDegreeSpec[];
};

/** Whether a harmony is all present in the music, partly implied, or an alternate analysis. */
export type HarmonyType = 'explicit' | 'implied' | 'alternate';

/** A harmony's `<offset>`: how far from its cursor position it applies. */
export type HarmonyOffset = Offset;

/** A `<harmony>` to write: the chord symbol, and optionally the diagram under it. */
export type HarmonySpec = HarmonyChordSpec & {
	/** Further chords stacked after this one, making a polychord. */
	polychord?: HarmonyChordSpec[];
	frame?: FrameSpec;
	placement?: 'above' | 'below';
	type?: HarmonyType;
	/** `arrangement` of the polychord's chords; ignored without one. */
	arrangement?: HarmonyArrangement;
	/** `print-frame`: whether the frame is printed. */
	printFrame?: boolean;
	/** The staff the symbol prints over, in a multi-staff part. */
	staff?: string;
	/**
	 * Where the symbol sits in the measure, in quarter-note beats — its own
	 * musical time, independent of any note. Without it the symbol goes at the
	 * write cursor; with it `<backup>`/`<forward>` are laid down to reach the beat.
	 */
	onset?: number;
	/** An `<offset>` from that position, in quarter-note beats. */
	offset?: { beats: number; sound?: boolean };
};

/** Tags that open a new harmony-chord group. */
const CHORD_START = new Set(['root', 'numeral', 'function']);

/** Tags that belong to a harmony-chord group after its opening element. */
const CHORD_PART = new Set(['kind', 'inversion', 'bass', 'degree']);

/** `<harmony>` children that follow `<frame>`, so a later {@link Harmony.setFrame} inserts ahead of them. */
const AFTER_FRAME = new Set(['offset', 'footnote', 'level', 'staff']);

/** `<harmony>` children that follow `<offset>`. */
const AFTER_OFFSET = new Set(['footnote', 'level', 'staff']);

/**
 * A `<harmony>`: a chord symbol (and optionally a fretboard {@link Frame}) that
 * sits above a note. Its fields — root, kind, bass — round-trip as plain child
 * elements; this class reads them typed. It has two placements that answer
 * different questions: {@link measureBeat} is where the symbol sits in musical
 * time, and {@link nextNote} is the note it is drawn over, which may start
 * later or never (a chord change over a held note).
 */
export class Harmony extends MElement {
	constructor() {
		super('harmony');
	}

	/**
	 * Each chord of this harmony in document order: one for a plain chord
	 * symbol, several for a polychord.
	 */
	get chords(): HarmonyChord[] {
		const groups: MElement[][] = [];
		for (const child of this.childrenOfType(MElement)) {
			if (CHORD_START.has(child.tag)) {
				groups.push([child]);
			} else if (CHORD_PART.has(child.tag) && groups.length > 0) {
				groups.at(-1)!.push(child);
			}
		}
		return groups.map(readChord);
	}

	/** The first chord's root from `<root>` (`<root-step>` + `<root-alter>`), or null for a numeral or function chord. */
	get root(): HarmonyStep | null {
		return this.chords[0]?.root ?? null;
	}

	/** The first chord's Roman numeral or Nashville number, or null for a letter-root chord. */
	get numeral(): HarmonyNumeral | null {
		return this.chords[0]?.numeral ?? null;
	}

	/** The first chord's deprecated `<function>` text, or null. */
	get function(): string | null {
		return this.chords[0]?.function ?? null;
	}

	/** The first chord's quality from `<kind>`: the enum `value`, its printed `text`, and its formatting. */
	get kind(): HarmonyKind | null {
		return this.chords[0]?.kind ?? null;
	}

	/** The first chord's `<inversion>`, or null when it states none. */
	get inversion(): HarmonyInversion | null {
		return this.chords[0]?.inversion ?? null;
	}

	/** The first chord's slash-chord bass from `<bass>`, or null. */
	get bass(): HarmonyBass | null {
		return this.chords[0]?.bass ?? null;
	}

	/** The first chord's added, altered and subtracted degrees, in document order. */
	get degrees(): HarmonyDegree[] {
		return this.chords[0]?.degrees ?? [];
	}

	/** The fretboard/chord diagram (`<frame>`) carried by this harmony, or null. */
	get frame(): Frame | null {
		return this.childrenOfType(Frame)[0] ?? null;
	}

	/**
	 * Upsert the fretboard diagram (`<frame>`), positioned after the chord symbol's
	 * own children and before the `<offset>`/`<staff>` tail.
	 */
	setFrame(spec: FrameSpec): Frame {
		this.frame?.remove();
		const frame = buildFrame(spec);
		this.insertBefore(frame, this.firstChildIn(AFTER_FRAME));
		return frame;
	}

	/** `type`; null when unstated. */
	get type(): HarmonyType | null {
		const type = this.getAttribute('type');
		return type === 'explicit' || type === 'implied' || type === 'alternate'
			? type
			: null;
	}

	/** `arrangement` of a polychord's chords; null when unstated. */
	get arrangement(): HarmonyArrangement | null {
		return arrangementOf(this);
	}

	/** Whether the frame is printed (`print-frame`); null when unstated (implementation-specific). */
	get printFrame(): boolean | null {
		return yesNoOrNull(this, 'print-frame');
	}

	/**
	 * The staff this harmony prints over; '1' when omitted, matching
	 * {@link Note.staff}.
	 */
	get staff(): string {
		return this.child('staff')?.text ?? '1';
	}

	/** Upsert `<staff>`, or remove it with null. */
	setStaff(staff: string | null): void {
		this.child('staff')?.remove();
		if (staff != null) {
			appendValue(this, 'staff', staff);
		}
	}

	/** The `<offset>` from the harmony's position, or null when it applies where it sits. */
	get offset(): HarmonyOffset | null {
		return offsetOf(this, false);
	}

	/**
	 * Upsert `<offset>` from a beat count, converted with the divisions in effect
	 * at this harmony, or remove it with null. The harmony must be in a measure
	 * with `<divisions>` declared.
	 */
	setOffset(offset: OffsetSpec | null): void {
		writeOffset(this, offset, () => this.firstChildIn(AFTER_OFFSET));
	}

	/**
	 * Onset within the measure, in quarter-note beats: where this harmony sits in
	 * the backup/forward fold, before any {@link offset}. This is the chord
	 * change's own time; {@link nextNote} may start later.
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

	/**
	 * The nearest non-`<chord/>`-member note after this harmony in its measure —
	 * the note the chord symbol sits above. Same semantics as {@link Direction.nextNote}.
	 */
	get nextNote(): Note | null {
		return adjacentNote(this, 1);
	}

	/** `placement`; null when unstated. */
	get placement(): 'above' | 'below' | null {
		return placementOf(this);
	}

	/** Whether the chord symbol is drawn (`print-object`); true when unstated. */
	get printObject(): boolean {
		return yesNoOf(this, 'print-object', true);
	}

	/** Set `print-object`, or remove it with null to restore the default. */
	setPrintObject(value: boolean | null): void {
		setYesNo(this, 'print-object', value);
	}

	/** The measure this harmony sits in. An attached harmony always has one. */
	get measure(): Measure {
		return required(this.closest(Measure), '<measure> ancestor of <harmony>');
	}

	private firstChildIn(tags: Set<string>): MElement | null {
		return (
			this.childrenOfType(MElement).find((child) => tags.has(child.tag)) ?? null
		);
	}
}

/** Read one harmony-chord group, its opening element first. */
function readChord(group: MElement[]): HarmonyChord {
	const [start] = group;
	const part = (tag: string) => group.find((element) => element.tag === tag);
	const bass = part('bass') ?? null;
	const bassStep = readStep(bass, 'bass-step', 'bass-alter');
	const inversion = part('inversion');
	const inversionText = inversion?.text;
	return {
		root:
			start!.tag === 'root'
				? readStep(start!, 'root-step', 'root-alter')
				: null,
		numeral: start!.tag === 'numeral' ? readNumeral(start!) : null,
		function: start!.tag === 'function' ? start!.text : null,
		kind: readKind(part('kind')),
		inversion:
			inversionText == null || inversionText.trim() === ''
				? null
				: {
						value: Number(inversionText),
						text: inversion!.getAttribute('text'),
					},
		bass:
			bassStep == null
				? null
				: {
						...bassStep,
						separator: bass!.child('bass-separator')?.text ?? null,
						arrangement: arrangementOf(bass!),
					},
		degrees: group
			.filter((element) => element.tag === 'degree')
			.map(readDegree),
	};
}

/** Read a `<root>`/`<bass>` block's step + alter into a {@link HarmonyStep}. */
function readStep(
	parent: MElement | null,
	stepTag: string,
	alterTag: string,
): HarmonyStep | null {
	const stepElement = parent?.child(stepTag);
	const step = stepElement?.text;
	if (step == null) {
		return null;
	}
	return {
		step,
		alter: numberOrNull(parent!.child(alterTag)),
		text: stepElement!.getAttribute('text'),
	};
}

function readKind(kind: MElement | undefined): HarmonyKind | null {
	const value = kind?.text;
	if (value == null) {
		return null;
	}
	return {
		value: value as HarmonyKindValue,
		text: kind!.getAttribute('text'),
		useSymbols: yesNoOrNull(kind!, 'use-symbols'),
		stackDegrees: yesNoOrNull(kind!, 'stack-degrees'),
		parenthesesDegrees: yesNoOrNull(kind!, 'parentheses-degrees'),
		bracketDegrees: yesNoOrNull(kind!, 'bracket-degrees'),
		halign: textAlignOf(kind!, 'halign'),
		valign: verticalAlignOf(kind!),
	};
}

function readNumeral(numeral: MElement): HarmonyNumeral {
	const root = numeral.child('numeral-root');
	const key = numeral.child('numeral-key');
	return {
		root: Number(required(root?.text, '<numeral-root> of <numeral>')),
		text: root!.getAttribute('text'),
		alter: numberOrNull(numeral.child('numeral-alter')),
		key: key
			? {
					fifths: Number(
						required(key.child('numeral-fifths')?.text, '<numeral-fifths>'),
					),
					mode: required(
						key.child('numeral-mode')?.text,
						'<numeral-mode>',
					) as HarmonyNumeralMode,
					printObject: yesNoOf(key, 'print-object', true),
				}
			: null,
	};
}

function readDegree(degree: MElement): HarmonyDegree {
	const value = degree.child('degree-value');
	const alter = degree.child('degree-alter');
	const type = degree.child('degree-type');
	const symbol = value?.getAttribute('symbol');
	return {
		value: Number(required(value?.text, '<degree-value> of <degree>')),
		alter: Number(alter?.text ?? 0),
		type: required(
			type?.text,
			'<degree-type> of <degree>',
		) as HarmonyDegreeType,
		symbol: isDegreeSymbol(symbol) ? symbol : null,
		text: value!.getAttribute('text'),
		typeText: type!.getAttribute('text'),
		plusMinus: alter ? yesNoOf(alter, 'plus-minus', false) : false,
		printObject: yesNoOf(degree, 'print-object', true),
	};
}

function isDegreeSymbol(
	value: string | null | undefined,
): value is HarmonyDegreeSymbol {
	return (
		value === 'major' ||
		value === 'minor' ||
		value === 'augmented' ||
		value === 'diminished' ||
		value === 'half-diminished'
	);
}

function arrangementOf(element: MElement): HarmonyArrangement | null {
	const value = element.getAttribute('arrangement');
	return value === 'vertical' || value === 'horizontal' || value === 'diagonal'
		? value
		: null;
}

/** A yes-no attribute, null when unstated: for the ones MusicXML leaves to the application. */
function yesNoOrNull(element: MElement, name: string): boolean | null {
	const value = element.getAttribute(name);
	return value === 'yes' || value === 'no' ? value === 'yes' : null;
}

function numberOrNull(element: MElement | null): number | null {
	const text = element?.text;
	return text == null || text.trim() === '' ? null : Number(text);
}

/**
 * Build a detached `<harmony>` from a spec, children in schema order. Its
 * `onset` and `offset` need the measure, so {@link Measure.addHarmony} applies them.
 */
export function buildHarmony(spec: HarmonySpec): Harmony {
	const harmony = new Harmony();
	if (spec.type != null) {
		harmony.setAttribute('type', spec.type);
	}
	if (spec.printFrame != null) {
		setYesNo(harmony, 'print-frame', spec.printFrame);
	}
	if (spec.arrangement != null && spec.polychord?.length) {
		harmony.setAttribute('arrangement', spec.arrangement);
	}
	if (spec.placement != null) {
		harmony.setAttribute('placement', spec.placement);
	}
	for (const chord of [spec, ...(spec.polychord ?? [])]) {
		appendChord(harmony, chord);
	}
	if (spec.frame) {
		harmony.setFrame(spec.frame);
	}
	if (spec.staff != null) {
		harmony.setStaff(spec.staff);
	}
	return harmony;
}

/** Append one harmony-chord group: its root, numeral or function, then kind, inversion, bass, degrees. */
function appendChord(harmony: Harmony, spec: HarmonyChordSpec): void {
	if (spec.root) {
		harmony.append(buildRoot(spec.root));
	} else if (spec.numeral) {
		harmony.append(buildNumeral(spec.numeral));
	} else {
		appendValue(harmony, 'function', spec.function);
	}
	const kind = typeof spec.kind === 'string' ? { value: spec.kind } : spec.kind;
	const kindElement = appendValue(harmony, 'kind', kind.value);
	setYesNoIfStated(kindElement, 'use-symbols', kind.useSymbols);
	setOrRemove(kindElement, 'text', kind.text);
	setYesNoIfStated(kindElement, 'stack-degrees', kind.stackDegrees);
	setYesNoIfStated(kindElement, 'parentheses-degrees', kind.parenthesesDegrees);
	setYesNoIfStated(kindElement, 'bracket-degrees', kind.bracketDegrees);
	setOrRemove(kindElement, 'halign', kind.halign);
	setOrRemove(kindElement, 'valign', kind.valign);
	if (spec.inversion != null) {
		const inversion =
			typeof spec.inversion === 'number'
				? { value: spec.inversion }
				: spec.inversion;
		const element = appendValue(harmony, 'inversion', String(inversion.value));
		setOrRemove(element, 'text', inversion.text);
	}
	if (spec.bass) {
		harmony.append(buildBass(spec.bass));
	}
	for (const degree of spec.degrees ?? []) {
		harmony.append(buildDegree(degree));
	}
}

/** Build a `<root>`/`<bass>` step and alter, appended to `element`. */
function appendStep(
	element: MElement,
	tag: 'root' | 'bass',
	spec: HarmonyStepSpec,
): void {
	const step = appendValue(element, `${tag}-step`, spec.step);
	setOrRemove(step, 'text', spec.text);
	if (spec.alter != null) {
		appendValue(element, `${tag}-alter`, String(spec.alter));
	}
}

/** Build a `<root>` block: `<root-step>` plus `<root-alter>` when stated. */
function buildRoot(spec: HarmonyStepSpec): MElement {
	const element = new MElement('root');
	appendStep(element, 'root', spec);
	return element;
}

/** Build a `<bass>` block: an optional `<bass-separator>`, then the step and alter. */
function buildBass(spec: HarmonyBassSpec): MElement {
	const element = new MElement('bass');
	setOrRemove(element, 'arrangement', spec.arrangement);
	if (spec.separator != null) {
		appendValue(element, 'bass-separator', spec.separator);
	}
	appendStep(element, 'bass', spec);
	return element;
}

function buildNumeral(spec: HarmonyNumeralSpec): MElement {
	const element = new MElement('numeral');
	const root = appendValue(element, 'numeral-root', String(spec.root));
	setOrRemove(root, 'text', spec.text);
	if (spec.alter != null) {
		appendValue(element, 'numeral-alter', String(spec.alter));
	}
	if (spec.key) {
		const key = new MElement('numeral-key');
		setYesNoIfStated(key, 'print-object', spec.key.printObject);
		appendValue(key, 'numeral-fifths', String(spec.key.fifths));
		appendValue(key, 'numeral-mode', spec.key.mode);
		element.append(key);
	}
	return element;
}

function buildDegree(spec: HarmonyDegreeSpec): MElement {
	const element = new MElement('degree');
	setYesNoIfStated(element, 'print-object', spec.printObject);
	const value = appendValue(element, 'degree-value', String(spec.value));
	setOrRemove(value, 'symbol', spec.symbol);
	setOrRemove(value, 'text', spec.text);
	const alter = appendValue(element, 'degree-alter', String(spec.alter ?? 0));
	setYesNoIfStated(alter, 'plus-minus', spec.plusMinus);
	const type = appendValue(element, 'degree-type', spec.type);
	setOrRemove(type, 'text', spec.typeText);
	return element;
}

function setYesNoIfStated(
	element: MElement,
	name: string,
	value: boolean | undefined,
): void {
	if (value != null) {
		setYesNo(element, name, value);
	}
}
