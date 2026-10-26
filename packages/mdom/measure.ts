import {
	Barline,
	type BarlineSpec,
	buildBarline,
	buildEnding,
	type EndingSpec,
} from './barline';
import { type BeamRun, groupBeamRuns, groupBeams } from './beam';
import { type Chord, groupChords } from './chord';
import { Clef } from './clef';
import {
	buildDirection,
	buildNavigation,
	Direction,
	type DirectionSpec,
	type NavigationSpec,
} from './direction';
import { FiguredBass } from './figured-bass';
import type { Frame } from './frame';
import { buildHarmony, Harmony, type HarmonySpec } from './harmony';
import { buildKey, Key, type KeySpec } from './key';
import { LineDetail } from './line-detail';
import { MElement, type MNode, MText, required } from './m-node';
import {
	buildMeasureStyle,
	MeasureStyle,
	type MeasureStyleSpec,
	type StatefulMeasureStyleKind,
} from './measure-style';
import { Note } from './note';
import { measureIndexIn, Part } from './part';
import { Print } from './print';
import { cloneElement } from './registry';
import { Score } from './score';
import {
	appliesToStaff,
	attributeBackFrom,
	attributesBackFrom,
	divisionsBackFrom,
} from './signature';
import { Sound } from './sound';
import { StaffDetails } from './staff-details';
import { StaffTuning } from './staff-tuning';
import { buildTime, Time, type TimeSpec } from './time';
import { alignCursor, contentEnd, onsetsIn } from './timeline';
import {
	buildForPart,
	buildTranspose,
	ForPart,
	type ForPartSpec,
	shiftsPitchClass,
	Transpose,
	type TransposeSpec,
} from './transpose';
import { Voice } from './voice';

/** A `<measure>`. Holds notes, directions, and `<attributes>` (signatures). */
export class Measure extends MElement {
	constructor() {
		super('measure');
	}

	/**
	 * The `number` attribute. Valid MusicXML always carries one, and addMeasure
	 * sets it; absence is malformed. (Use {@link index} for position — `number` is
	 * the free-form, possibly-repeated printed label.)
	 */
	get number(): string {
		return required(this.getAttribute('number'), 'number on <measure>');
	}

	/**
	 * Whether this is an `implicit="yes"` measure: a pickup bar, or the back half
	 * of a measure split across a system break. It is short *by declaration*, not
	 * underfull by accident — a layout engine that misses this pads a pickup out to
	 * a full bar's width.
	 */
	get isImplicit(): boolean {
		return this.getAttribute('implicit') === 'yes';
	}

	/** The part this measure belongs to. An attached measure always has one. */
	get part(): Part {
		return required(this.closest(Part), '<part> ancestor of <measure>');
	}

	/** The `width` attribute in tenths (a layout hint); null when unset. */
	get width(): number | null {
		const width = this.getAttribute('width');
		return width == null ? null : Number(width);
	}

	set width(tenths: number) {
		this.setAttribute('width', String(tenths));
	}

	/** The measure's notes. */
	get notes(): Note[] {
		return this.childrenOfType(Note);
	}

	/**
	 * Position among the part's measures; -1 when detached. Distinct from
	 * {@link number}, which is the (free-form, possibly repeated) printed label.
	 */
	get index(): number {
		const part = this.closest(Part);
		return part ? measureIndexIn(part, this) : -1;
	}

	/**
	 * The `<clef>` in effect at the start of this measure for `staff` (default
	 * '1'): the nearest declaration at or before this measure. Clefs match their
	 * staff exactly; a numberless key/time applies to every staff.
	 */
	getClef(staff = '1'): Clef | null {
		return this.attributeBack(`clef:${staff}`, (attrs) =>
			attrs.childrenOfType(Clef).find((clef) => clef.staff === staff),
		);
	}

	/** The `<key>` in effect at the start of this measure for `staff`. */
	getKey(staff = '1'): Key | null {
		return this.attributeBack(`key:${staff}`, (attrs) =>
			attrs.childrenOfType(Key).find((key) => appliesToStaff(key, staff)),
		);
	}

	/** The `<time>` in effect at the start of this measure for `staff`. */
	getTime(staff = '1'): Time | null {
		return this.attributeBack(`time:${staff}`, (attrs) =>
			attrs.childrenOfType(Time).find((time) => appliesToStaff(time, staff)),
		);
	}

	/**
	 * The `<transpose>` in effect at the start of this measure for `staff`
	 * (default '1'): what to add to its written pitches to get sounding ones.
	 * Null when none has been declared, which means written pitch is sounding
	 * pitch. A numberless declaration applies to every staff.
	 */
	getTranspose(staff = '1'): Transpose | null {
		return this.attributeBack(`transpose:${staff}`, (attrs) =>
			attrs
				.childrenOfType(Transpose)
				.find((transpose) => appliesToStaff(transpose, staff)),
		);
	}

	/**
	 * The `<for-part>` in effect at the start of this measure for `staff` (default
	 * '1'): in a concert score, how a transposed part created from it is written.
	 * Null when none has been declared. Carries forward like {@link getTranspose}.
	 */
	getForPart(staff = '1'): ForPart | null {
		return this.attributeBack(`for-part:${staff}`, (attrs) =>
			attrs
				.childrenOfType(ForPart)
				.find((forPart) => appliesToStaff(forPart, staff)),
		);
	}

	/** `<staves>` count in effect (global); 1 when never declared. */
	get staveCount(): number {
		const staves = this.attributeBack(
			'staves',
			(attrs) => attrs.child('staves') ?? undefined,
		);
		return staves?.text == null ? 1 : Number(staves.text);
	}

	/** `<staff-lines>` in effect for `staff` (default '1'); 5 lines when unspecified. */
	getStaveLines(staff = '1'): number {
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
	 * The `<staff-details>` block in effect for `staff` (default '1'), carry-forward
	 * like {@link getClef}; null when none applies. Everything on it reads as
	 * DECLARED — use this when absence has to stay distinguishable from a default,
	 * e.g. "did the document actually state `<staff-lines>`?", which
	 * {@link getStaveLines} answers 5 to either way.
	 */
	getStaffDetails(staff = '1'): StaffDetails | null {
		return this.attributeBack(`staff-details:${staff}`, (attrs) =>
			attrs
				.childrenOfType(StaffDetails)
				.find((details) => appliesToStaff(details, staff)),
		);
	}

	/**
	 * Get or create the `<staff-details>` for `staff` in this measure's leading
	 * `<attributes>`, to declare how the staff is drawn from here on (its type,
	 * lines, tunings, capo, size). `number` is written only when `staff` is given,
	 * as with {@link setClef}; without it this is the numberless block, which
	 * applies to every staff.
	 */
	getOrCreateStaffDetails(staff?: string): StaffDetails {
		const attrs = attributesOf(this);
		const number = staff ?? null;
		const existing = attrs
			.childrenOfType(StaffDetails)
			.find((details) => details.getAttribute('number') === number);
		if (existing) {
			return existing;
		}
		const details = new StaffDetails();
		if (staff != null) {
			details.setAttribute('number', staff);
		}
		return placeInAttributes(attrs, details);
	}

	/**
	 * The `<staff-distance>` in effect above `staff` (default '1') in the system
	 * holding this measure, in tenths: a `<print>` override from this measure back
	 * to the one that starts the system (`new-system`/`new-page`, or the part's
	 * first measure), else the score's `<defaults>`. Null when neither states one,
	 * which leaves it to the application. MusicXML ignores it for a system's first
	 * staff. A system break the application made on its own is not visible here,
	 * so an override only reaches as far back as the last explicit break.
	 */
	getStaffDistance(staff = '1'): number | null {
		const part = this.part;
		const measures = part.measures;
		for (let index = this.index; index >= 0; index--) {
			const print = measures[index]?.print;
			const distance = print?.getStaffLayout(staff)?.distance;
			if (distance != null) {
				return distance;
			}
			if (print?.newSystem || print?.newPage) {
				break;
			}
		}
		return part.score.getStaffLayout(staff)?.distance ?? null;
	}

	/**
	 * The `<line-detail>` overrides in effect for `staff` (default '1'): the
	 * per-line appearance from the nearest `<staff-details>`. Empty when that block
	 * sets none, or when no `<staff-details>` applies.
	 */
	getLineDetails(staff = '1'): LineDetail[] {
		return [
			...(this.attributeBack(`line-details:${staff}`, (attrs) => {
				const details = attrs
					.childrenNamed('staff-details')
					.find((node) => appliesToStaff(node, staff));
				return details ? details.childrenOfType(LineDetail) : undefined;
			}) ?? []),
		];
	}

	/**
	 * The `<staff-tuning>` declarations in effect for `staff` (default '1'): the
	 * string tunings from the nearest `<staff-details>`, which is what identifies a
	 * tablature staff. Empty when that block declares none. Carry-forward, like
	 * {@link getClef}.
	 */
	getStaffTunings(staff = '1'): StaffTuning[] {
		return [
			...(this.attributeBack(`staff-tunings:${staff}`, (attrs) => {
				const details = attrs
					.childrenNamed('staff-details')
					.find((node) => appliesToStaff(node, staff));
				const tunings = details?.childrenOfType(StaffTuning);
				return tunings && tunings.length > 0 ? tunings : undefined;
			}) ?? []),
		];
	}

	/**
	 * Mid-measure `<clef>` changes for `staff` (default '1'), in order: the beat
	 * each lands on and the clef itself. MusicXML writes one as an `<attributes>`
	 * block sitting between two notes.
	 *
	 * The measure's *leading* `<attributes>` is excluded — that's the measure's own
	 * signature block, drawn with the stave (see {@link getClef}). A change's beat
	 * comes from the NEXT note's own {@link Note.measureBeat}, not from a running
	 * sum of what precedes it, because `measureBeat` already rewinds a `<backup>`:
	 * that's how a grand staff writes its lower staff's clef (upper notes, backup,
	 * `<attributes><clef number="2">`, lower notes), and the block belongs at beat 0
	 * rather than at the measure's end. A block trailing the LAST note lands on
	 * {@link endBeat} and engraves as the courtesy clef before the barline.
	 */
	clefChanges(staff = '1'): Array<{ beat: number; clef: Clef }> {
		const children = this.children;
		const firstNote = this.notes[0];
		if (!firstNote) {
			return []; // no notes: every <attributes> here is the measure's own signature
		}
		const changes: Array<{ beat: number; clef: Clef }> = [];
		for (
			let index = children.indexOf(firstNote);
			index < children.length;
			index++
		) {
			const node = children[index];
			if (!(node instanceof MElement) || node.tag !== 'attributes') {
				continue;
			}
			const clefs = node
				.childrenOfType(Clef)
				.filter((clef) => clef.staff === staff);
			if (clefs.length === 0) {
				continue;
			}
			const beat =
				nextNoteFrom(children, index + 1)?.measureBeat ?? this.endBeat;
			for (const clef of clefs) {
				changes.push({ beat, clef });
			}
		}
		return changes;
	}

	/**
	 * The clef in effect at the END of this measure for `staff` (default '1'): its
	 * last mid-measure change if it has one, else the clef it opened with. What the
	 * next measure compares against to decide whether to reprint.
	 */
	clefAtEnd(staff = '1'): Clef | null {
		return this.clefChanges(staff).at(-1)?.clef ?? this.getClef(staff);
	}

	/**
	 * The beat this measure's content runs out to: the latest onset + duration
	 * across every voice, in quarter-note beats. 0 when the measure is empty or no
	 * `<divisions>` has been declared.
	 */
	get endBeat(): number {
		const divisions = divisionsBackFrom(this, this.children.length);
		return divisions == null || divisions === 0
			? 0
			: contentEnd(this) / divisions;
	}

	/** Notes grouped by `<voice>`, in the order each voice first appears. */
	get voices(): Voice[] {
		const order: string[] = [];
		for (const note of this.notes) {
			const id = note.voice;
			if (!order.includes(id)) {
				order.push(id);
			}
		}
		return order.map((id) => {
			const staff = this.notes.find((note) => note.voice === id)?.staff ?? '1';
			return new Voice(this, id, staff);
		});
	}

	/** Notes grouped into chords: `<chord/>` runs collapsed, single notes 1-member. */
	get chords(): Chord[] {
		return groupChords(this.notes);
	}

	/** Beamed runs: each `<beam>` group as its ordered notes; unbeamed notes excluded. */
	get beams(): Note[][] {
		return groupBeams(this.notes);
	}

	/**
	 * Beamed runs with their secondary-beam break positions — {@link beams} plus
	 * the sub-beam splits a renderer needs to draw a run like a triplet-of-16ths
	 * followed by two 16ths under one primary beam. See {@link groupBeamRuns}.
	 */
	beamRuns(): BeamRun[] {
		return groupBeamRuns(this.notes);
	}

	/**
	 * `<measure-style><multiple-rest>` count for `staff` (default '1'), when this
	 * measure begins a multi-rest; null otherwise. Deliberately not a carry-forward
	 * query: `<multiple-rest>` carries its own extent in its text and is never
	 * restated or stopped, so only this measure's own `<attributes>` are read.
	 */
	getMultiRestCount(staff = '1'): number | null {
		const count = this.childrenNamed('attributes')
			.flatMap((attrs) => attrs.childrenNamed('measure-style'))
			.filter((style) => appliesToStaff(style, staff))
			.map((style) => style.child('multiple-rest'))
			.find((node) => node != null);
		return count?.text == null ? null : Number(count.text);
	}

	/** All style declarations in this measure, including mid-measure starts/stops. */
	get measureStyles(): MeasureStyle[] {
		return this.childrenNamed('attributes').flatMap((attrs) =>
			attrs.childrenOfType(MeasureStyle),
		);
	}

	/**
	 * Append a style declaration, optionally at an onset in quarter-note beats.
	 * Starts/stops are explicit; this does not alter the underlying notes.
	 * Remove a declaration using its inherited remove() method.
	 */
	addMeasureStyle(spec: MeasureStyleSpec & { onset?: number }): MeasureStyle {
		const style = buildMeasureStyle(spec);
		return placeInAttributes(this.getOrCreateAttributes(spec), style);
	}

	/**
	 * Active start declaration at the opening of this measure for a style family.
	 * The latest matching stop clears that family; other families are independent.
	 * Use measureStyles for all declarations, including changes later in the bar.
	 */
	getActiveMeasureStyle(
		kind: StatefulMeasureStyleKind,
		staff = '1',
	): MeasureStyle | null {
		const declaration = this.attributeBack(
			`measure-style:${kind}:${staff}`,
			(attrs) =>
				attrs
					.childrenOfType(MeasureStyle)
					.findLast(
						(style) => style.kind === kind && appliesToStaff(style, staff),
					),
		);
		return declaration?.type === 'start' ? declaration : null;
	}

	/** The measure's directions. */
	get directions(): Direction[] {
		return this.childrenOfType(Direction);
	}

	/** The measure's `<barline>` markers (e.g. a left repeat, a right final bar). */
	get barlines(): Barline[] {
		return this.childrenOfType(Barline);
	}

	/** The measure's `<harmony>` chord symbols, in document order. */
	get harmonies(): Harmony[] {
		return this.childrenOfType(Harmony);
	}

	/** The measure's `<figured-bass>` stacks (continuo numerals), in document order. */
	get figuredBasses(): FiguredBass[] {
		return this.childrenOfType(FiguredBass);
	}

	/**
	 * Every `<sound>` that applies to this measure: the ones inside its
	 * `<direction>`s in document order, then the measure's own standalone
	 * `<sound>` children. MusicXML allows both spellings with the same meaning, so
	 * merging them here is the whole point — a consumer looks in one place.
	 */
	get sounds(): Sound[] {
		const fromDirections = this.directions.flatMap((direction) =>
			direction.sound ? [direction.sound] : [],
		);
		return [...fromDirections, ...this.childrenOfType(Sound)];
	}

	/** The fretboard/chord diagrams (`<frame>`) carried by this measure's `<harmony>` elements. */
	get frames(): Frame[] {
		return this.harmonies.flatMap((harmony) =>
			harmony.frame ? [harmony.frame] : [],
		);
	}

	/** The leading `<print>` (break flags and per-system layout for the system starting here), or null. */
	get print(): Print | null {
		return this.childrenOfType(Print)[0] ?? null;
	}

	/**
	 * Get or create the measure's leading `<print>`, positioned first (before
	 * `<attributes>` and notes). Set `newSystem`/`newPage` on it to force a break.
	 */
	getOrCreatePrint(): Print {
		const existing = this.print;
		if (existing) {
			return existing;
		}
		const print = new Print();
		this.insertBefore(print, this.children[0] ?? null);
		return print;
	}

	/**
	 * Append a `<harmony>` chord symbol at the write cursor — the point after
	 * everything currently in the measure, so a symbol added before its notes sits
	 * above them, which is how {@link Harmony.nextNote} binds the two. With
	 * `onset` (in quarter-note beats) it goes at that beat instead,
	 * `<backup>`/`<forward>` laid down to reach it: a chord change in musical
	 * time, whether or not a note starts there.
	 */
	addHarmony(spec: HarmonySpec): Harmony {
		const harmony = buildHarmony(spec);
		if (spec.onset != null) {
			const divisions = required(
				divisionsBackFrom(this, this.children.length),
				'divisions to place <harmony> at an onset',
			);
			alignCursor(this, spec.onset * divisions);
		}
		this.append(harmony);
		if (spec.offset) {
			harmony.setOffset(spec.offset);
		}
		return harmony;
	}

	/**
	 * Add a `<barline>`: a repeat, a volta bracket, or a bar style at one edge of
	 * the measure. A `location: 'left'` barline is positioned ahead of everything;
	 * every other location appends, so add the right barline once the measure's
	 * content is in — that is where the edge it draws is.
	 */
	addBarline(spec: BarlineSpec): Barline {
		const barline = buildBarline(spec);
		if (spec.location === 'left') {
			// Ahead of everything, but behind any left barline already there, so two
			// of them keep the order they were written in.
			const after =
				this.children.find((node) => !(node instanceof Barline)) ?? null;
			this.insertBefore(barline, after);
		} else {
			this.append(barline);
		}
		return barline;
	}

	/**
	 * Open or close a volta bracket on this measure: a `start` goes on the left
	 * barline, a `stop` or `discontinue` on the right, which is where MusicXML
	 * draws them. A bracket over one measure takes both calls on it. When that
	 * edge already has a barline with no ending (the backward repeat a first
	 * ending closes on), the ending joins it; otherwise a new barline is added,
	 * so close an ending once the measure's content is in.
	 */
	addEnding(spec: EndingSpec): Barline {
		const location = spec.type === 'start' ? 'left' : 'right';
		const edge =
			location === 'left'
				? this.barlines.filter((barline) => barline.location === 'left')
				: [this.children.at(-1)].filter(
						(node): node is Barline =>
							node instanceof Barline && node.location === 'right',
					);
		const host = edge.find((barline) => !barline.child('ending'));
		if (!host) {
			return this.addBarline({ location, ending: spec });
		}
		// <ending> sits after everything a barline holds but its <repeat>.
		host.insertBefore(buildEnding(spec), host.child('repeat'));
		return host;
	}

	/**
	 * Append a `<direction>` at the write cursor: a tempo mark, an expression, a
	 * dynamic. Add it before the notes it applies to — a direction carries no
	 * `<duration>`, so it sounds wherever the cursor stands.
	 */
	addDirection(spec: DirectionSpec): Direction {
		const direction = buildDirection(spec);
		this.append(direction);
		if (spec.offset) {
			direction.setOffset(spec.offset);
		}
		return direction;
	}

	/**
	 * Add a segno, coda or jump — D.S., D.C., to-coda, fine — printed and with
	 * the `<sound>` that makes playback take it. It goes at the write cursor, so a
	 * segno or coda is added before the notes it marks and a jump after the notes
	 * it follows; with `onset` (in quarter-note beats) it goes at that beat
	 * instead, `<backup>`/`<forward>` laid down to reach it.
	 */
	addNavigation(spec: NavigationSpec): Direction {
		const direction = buildNavigation(spec);
		if (spec.onset != null) {
			const divisions = required(
				divisionsBackFrom(this, this.children.length),
				'divisions to place a navigation mark at an onset',
			);
			alignCursor(this, spec.onset * divisions);
		}
		this.append(direction);
		return direction;
	}

	/**
	 * Get or create the reader/writer for a `<voice>`; remembers the staff so notes
	 * added through it are positioned and labeled correctly.
	 */
	getOrCreateVoice(id: string, opts?: { staff?: string }): Voice {
		return new Voice(this, id, opts?.staff ?? '1');
	}

	/**
	 * Upsert the `<clef>` in this measure's `<attributes>`. Without `onset` this is
	 * the measure's leading block — "the measure opens on this clef" — created and
	 * positioned before the first note if absent; with `onset` it is a mid-measure
	 * change at that beat, the thing {@link clefChanges} reads back. The caller
	 * never assembles `<attributes>` by hand.
	 */
	setClef(spec: {
		sign: string;
		line?: number;
		octaveChange?: number;
		staff?: string;
		onset?: number;
	}): Clef {
		const attrs = this.getOrCreateAttributes(spec);
		const staff = spec.staff ?? '1';
		attrs
			.childrenOfType(Clef)
			.find((clef) => clef.staff === staff)
			?.remove();
		const clef = new Clef();
		if (spec.staff != null) {
			clef.setAttribute('number', spec.staff);
		}
		appendValue(clef, 'sign', spec.sign);
		if (spec.line != null) {
			appendValue(clef, 'line', String(spec.line));
		}
		if (spec.octaveChange != null) {
			appendValue(clef, 'clef-octave-change', String(spec.octaveChange));
		}
		return placeInAttributes(attrs, clef);
	}

	/** Upsert the `<key>` in this measure's `<attributes>`; `onset` as in {@link setClef}. */
	setKey(spec: KeySpec): Key {
		const key = buildKey(spec);
		const attrs = this.getOrCreateAttributes(spec);
		attrs
			.childrenOfType(Key)
			.find((key) => key.getAttribute('number') === (spec.staff ?? null))
			?.remove();
		return placeInAttributes(attrs, key);
	}

	/**
	 * Upsert the `<transpose>` for `staff` in this measure's `<attributes>`; `onset`
	 * as in {@link setClef}. Without `staff` it is the numberless declaration, which
	 * applies to every staff. `{ chromatic: 0 }` declares concert pitch from here.
	 *
	 * This states how the written notes sound; it never rewrites a `<pitch>`. A
	 * concert score's notes are already at sounding pitch, so there it may only
	 * shift by octaves or double: anything else throws, and the transposed part
	 * belongs in {@link setForPart} instead.
	 */
	setTranspose(
		spec: TransposeSpec & { staff?: string; onset?: number },
	): Transpose {
		const transpose = buildTranspose(spec, spec.staff);
		if (this.closest(Score)?.isConcertScore && shiftsPitchClass(transpose)) {
			throw new Error(
				'A concert score may only transpose by octaves; declare the part transposition with setForPart',
			);
		}
		const attrs = transposeChoiceBlock(
			this.getOrCreateAttributes(spec),
			'transpose',
		);
		const number = spec.staff ?? null;
		attrs
			.childrenOfType(Transpose)
			.find((each) => each.staff === number)
			?.remove();
		return placeInAttributes(attrs, transpose);
	}

	/**
	 * Upsert the `<for-part>` for `staff` in this measure's `<attributes>`; `onset`
	 * as in {@link setClef}: the transposition, and clef if it changes, that a
	 * transposed part created from this concert score is written in. Throws unless
	 * the score is a concert score (see {@link Score.setConcertScore}), the only
	 * place MusicXML allows one. An `<attributes>` block holds `<transpose>`s or
	 * `<for-part>`s but not both, so where the block already transposes this lands
	 * in a second block at the same position; the reads see both alike.
	 */
	setForPart(spec: ForPartSpec & { staff?: string; onset?: number }): ForPart {
		const score = this.closest(Score);
		if (score && !score.isConcertScore) {
			throw new Error('<for-part> is only allowed in a concert score');
		}
		const attrs = transposeChoiceBlock(
			this.getOrCreateAttributes(spec),
			'for-part',
		);
		const number = spec.staff ?? null;
		attrs
			.childrenOfType(ForPart)
			.find((each) => each.staff === number)
			?.remove();
		return placeInAttributes(attrs, buildForPart(spec, spec.staff));
	}

	/**
	 * Copy into this measure the signatures in effect at the start of `source` —
	 * clef, key, time, divisions and the rest of the carried set — for every staff
	 * of the part. Idempotent, and never overwrites what this measure already
	 * declares.
	 *
	 * Mid-score this is redundant, since signatures carry forward through an empty
	 * measure on their own. It matters for a measure inserted BEFORE every
	 * declaration (see {@link Part.insertMeasureAt}), which would otherwise render
	 * as a bare, clefless stave.
	 */
	copySignaturesFrom(source: Measure): void {
		carrySignaturesInto(this, source);
	}

	/**
	 * Write into this measure's leading `<attributes>` every carried attribute that
	 * was in effect just before it — the signatures earlier measures established.
	 * Never overwrites what this measure already declares. Creates and positions
	 * the `<attributes>` block (before the first note) and keeps its children in
	 * schema order.
	 *
	 * This is what makes a measure renderable in isolation: the operation a slice,
	 * an excerpt, or a single-measure preview needs before dropping what came
	 * before it.
	 */
	materializeSignatures(): void {
		carrySignaturesInto(this, this);
	}

	/** Upsert the `<time>` in this measure's `<attributes>`; `onset` as in {@link setClef}. */
	setTime(spec: TimeSpec): Time {
		const time = buildTime(spec);
		const attrs = this.getOrCreateAttributes(spec);
		attrs
			.childrenOfType(Time)
			.find((time) => time.getAttribute('number') === (spec.staff ?? null))
			?.remove();
		return placeInAttributes(attrs, time);
	}

	/**
	 * Upsert `<divisions>`: the ticks per quarter note every `<duration>` in the
	 * part is counted in. Global rather than per-staff, and it carries forward, so
	 * one declaration in the first measure covers the score — which is what
	 * {@link Voice.addNote} writes for you when nothing has declared it yet.
	 */
	setDivisions(value: number): MElement {
		const attrs = this.getOrCreateAttributes();
		attrs.child('divisions')?.remove();
		return placeInAttributes(attrs, valueElement('divisions', String(value)));
	}

	/**
	 * Upsert `<staves>`: how many staves this part is drawn on (2 for a grand
	 * staff). Without it a `getOrCreateVoice('1', { staff: '2' })` labels its notes
	 * for a staff nobody declared, and {@link staveCount} still reads 1. Global,
	 * and carried forward like {@link setDivisions}.
	 */
	setStaveCount(count: number): MElement {
		const attrs = this.getOrCreateAttributes();
		attrs.child('staves')?.remove();
		return placeInAttributes(attrs, valueElement('staves', String(count)));
	}

	/**
	 * Get or create an `<attributes>` block to write into — the escape hatch behind
	 * {@link setClef} and friends, for the corners they don't cover (a
	 * `<directive>`).
	 *
	 * Without `onset` this is the measure's LEADING block, positioned before the
	 * first note: the signature drawn with the stave. With `onset` (in quarter-note
	 * beats) it is a mid-measure change at that beat, the `<attributes>` MusicXML
	 * writes between two notes — `<backup>`/`<forward>` are laid down to reach the
	 * beat, exactly as adding a note there would. The distinction is the caller's
	 * to state, so "the measure opens in this key" can't silently become "the key
	 * changes here" just because a note was added first.
	 *
	 * Children land in schema order however they arrive, so a block written this
	 * way still validates.
	 */
	getOrCreateAttributes(opts?: { onset?: number }): MElement {
		if (opts?.onset == null) {
			return attributesOf(this);
		}
		const divisions = required(
			divisionsBackFrom(this, this.children.length),
			'divisions to place <attributes> at an onset',
		);
		const target = opts.onset * divisions;
		const onsets = onsetsIn(this);
		const leading = leadingAttributes(this);
		const existing = this.childrenNamed('attributes').find(
			(block) => !leading.includes(block) && onsets.get(block) === target,
		);
		if (existing) {
			return existing;
		}
		alignCursor(this, target);
		const attrs = new MElement('attributes');
		this.append(attrs);
		return attrs;
	}

	/**
	 * First `<attributes>` back from the start of this measure (own leading block,
	 * then earlier measures) for which `pick` matches — the carry-forward shape.
	 */
	private attributeBack<T>(
		key: string,
		pick: (attrs: MElement) => T | null | undefined,
	): T | null {
		// "At the start of this measure": scan from the first note, so the measure's
		// own leading <attributes> count but a mid-measure change (after a note,
		// which only a note-level query should see) does not.
		const firstNote = this.notes[0];
		const fromIndex = firstNote
			? this.children.indexOf(firstNote)
			: this.children.length;
		return attributeBackFrom(this, fromIndex, key, pick);
	}
}

/**
 * Get or create this measure's LEADING `<attributes>` block — the signature drawn
 * with the stave. Positioned before the first note, so it stays the leading block
 * on a measure that already has notes rather than becoming a mid-measure change;
 * {@link Measure.getOrCreateAttributes} is how a caller asks for one of those.
 */
export function attributesOf(measure: Measure): MElement {
	const existing = leadingAttributes(measure)[0];
	if (existing) {
		return existing;
	}
	const attrs = new MElement('attributes');
	measure.insertBefore(attrs, measure.notes[0] ?? null);
	return attrs;
}

/**
 * Add `child` to an `<attributes>` block and restore schema order. Every
 * `<attributes>` writer goes through here: the block is a fixed sequence, so an
 * append that happens to be in order for one call order is invalid for the next
 * — which is how `<divisions>` written after the signatures ended up last.
 */
export function placeInAttributes<T extends MElement>(
	attrs: MElement,
	child: T,
): T {
	attrs.append(child);
	sortAttributeChildren(attrs);
	return child;
}

/** A leaf `<tag>text</tag>` element, detached. */
export function valueElement(tag: string, text: string): MElement {
	const element = new MElement(tag);
	element.append(new MText(text));
	return element;
}

/** Append a leaf `<tag>text</tag>` child to `parent`. */
export function appendValue(
	parent: MElement,
	tag: string,
	text: string,
): MElement {
	const element = valueElement(tag, text);
	parent.append(element);
	return element;
}

/** The first `<note>` at or after `from` in `children`, or null. */
function nextNoteFrom(children: readonly MNode[], from: number): Note | null {
	for (let index = from; index < children.length; index++) {
		const node = children[index];
		if (node instanceof Note) {
			return node;
		}
	}
	return null;
}

/**
 * The `<attributes>` children that carry forward past their own measure. Anything
 * outside this set (a `<footnote>`, an `<instruments>`) belongs only to the
 * measure that wrote it.
 */
const CARRIED = new Set([
	'divisions',
	'key',
	'time',
	'clef',
	'staves',
	'staff-details',
	'transpose',
	'for-part',
	'part-symbol',
	'measure-style',
]);

/** The carried attributes that are score-wide rather than per-staff. */
const GLOBAL = new Set(['divisions', 'staves', 'part-symbol']);

/** The `<attributes>` content model, in schema order. */
const ATTRIBUTE_ORDER = [
	'footnote',
	'level',
	'divisions',
	'key',
	'time',
	'staves',
	'part-symbol',
	'instruments',
	'clef',
	'staff-details',
	'transpose',
	'for-part',
	'directive',
	'measure-style',
];

/**
 * The staves a carried `<attributes>` child applies to. A numberless key, time,
 * staff-details, transpose or for-part applies to EVERY staff — so nothing further back in
 * that tag can still apply. Clefs are the exception: one matches a single staff
 * exactly, and a numberless clef is staff 1's.
 */
function staffTargets(element: MElement, staves: string[]): string[] {
	const number = element.getAttribute('number');
	if (element.tag === 'clef') {
		return [number ?? '1'];
	}
	return number == null ? staves : [number];
}

/** This measure's `<attributes>` blocks that precede its first note. */
function leadingAttributes(measure: Measure): MElement[] {
	const firstNote = measure.notes[0];
	const limit = firstNote
		? measure.children.indexOf(firstNote)
		: measure.children.length;
	const blocks: MElement[] = [];
	for (let index = 0; index < limit; index++) {
		const node = measure.children[index];
		if (node instanceof MElement && node.tag === 'attributes') {
			blocks.push(node);
		}
	}
	return blocks;
}

/**
 * Write the signatures in effect at the start of `source` into `target`'s leading
 * `<attributes>`. The backward walk is the same one every carry-forward query
 * uses; the bookkeeping here is which staves each tag has already been answered
 * for, so a nearer declaration always wins and a numberless one closes out its
 * tag entirely. What `target` already declares is claimed first, so this never
 * overwrites — and is idempotent.
 */
function carrySignaturesInto(target: Measure, source: Measure): void {
	const staveCount = Math.max(source.staveCount, target.staveCount);
	const staves = Array.from({ length: staveCount }, (_, index) =>
		String(index + 1),
	);
	const satisfied = new Map<string, Set<string>>();

	const claim = (element: MElement): boolean => {
		if (!CARRIED.has(element.tag)) {
			return false;
		}
		let taken = satisfied.get(element.tag);
		if (!taken) {
			taken = new Set<string>();
			satisfied.set(element.tag, taken);
		}
		if (GLOBAL.has(element.tag)) {
			if (taken.size > 0) {
				return false;
			}
			taken.add('*');
			return true;
		}
		const wanted = staffTargets(element, staves);
		if (wanted.every((staff) => taken!.has(staff))) {
			return false;
		}
		for (const staff of wanted) {
			taken.add(staff);
		}
		return true;
	};

	const existing = leadingAttributes(target);
	for (const attrs of existing) {
		for (const child of attrs.childrenOfType(MElement)) {
			claim(child);
		}
	}

	const firstNote = source.notes[0];
	const fromIndex = firstNote
		? source.children.indexOf(firstNote)
		: source.children.length;
	const carried: MElement[] = [];
	for (const attrs of attributesBackFrom(source, fromIndex)) {
		for (const child of attrs.childrenOfType(MElement)) {
			if (claim(child)) {
				carried.push(child);
			}
		}
	}
	if (carried.length === 0) {
		return;
	}

	let block = existing[0];
	if (!block) {
		block = new MElement('attributes');
		target.insertBefore(block, target.notes[0] ?? null);
	}
	for (const element of carried) {
		block.append(cloneElement(element));
	}
	sortAttributeChildren(block);
	if (block.child('transpose')) {
		const forParts = block.childrenNamed('for-part');
		if (forParts.length > 0) {
			const holder = transposeChoiceBlock(block, 'for-part');
			for (const forPart of forParts) {
				holder.append(forPart);
			}
			sortAttributeChildren(holder);
		}
	}
}

/**
 * The block to write a `<transpose>` or `<for-part>` into, starting from
 * `attrs`. The schema makes the two a choice — one `<attributes>` holds either
 * kind, never both — so when `attrs` holds the other kind this is the block
 * directly after it, created there if needed. Nothing sits between the two, so
 * they share an onset and every carry-forward read sees both.
 */
export function transposeChoiceBlock(
	attrs: MElement,
	tag: 'transpose' | 'for-part',
): MElement {
	const rival = tag === 'transpose' ? 'for-part' : 'transpose';
	if (!attrs.child(rival)) {
		return attrs;
	}
	const parent = required(attrs.parent, 'parent of <attributes>');
	const next = parent.children[parent.children.indexOf(attrs) + 1] ?? null;
	if (
		next instanceof MElement &&
		next.tag === 'attributes' &&
		!next.child(rival)
	) {
		return next;
	}
	const block = new MElement('attributes');
	parent.insertBefore(block, next);
	return block;
}

/**
 * Reorder an `<attributes>` block's children into schema order (and by staff
 * within a tag), so a block assembled from several measures still validates.
 * Re-appending in order rewrites the child list, since `append` detaches first.
 */
function sortAttributeChildren(block: MElement): void {
	const ranked = [...block.children].map((node, index) => {
		const element = node instanceof MElement ? node : null;
		const tagRank = element ? ATTRIBUTE_ORDER.indexOf(element.tag) : -1;
		return {
			node,
			tagRank: tagRank < 0 ? ATTRIBUTE_ORDER.length : tagRank,
			staffRank: Number(element?.getAttribute('number') ?? 0),
			index,
		};
	});
	ranked.sort(
		(left, right) =>
			left.tagRank - right.tagRank ||
			left.staffRank - right.staffRank ||
			left.index - right.index,
	);
	for (const { node } of ranked) {
		block.append(node);
	}
}
