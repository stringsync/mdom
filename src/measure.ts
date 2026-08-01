import { MElement, MText, type MNode, required } from './m-node';
import { Note } from './note';
import { Part } from './part';
import { Clef } from './clef';
import { Key } from './key';
import { Time } from './time';
import { Voice } from './voice';
import { type Chord, groupChords } from './chord';
import { type BeamRun, groupBeamRuns, groupBeams } from './beam';
import { Direction } from './direction';
import { Barline } from './barline';
import { FiguredBass } from './figured-bass';
import type { Frame } from './frame';
import { Harmony } from './harmony';
import { LineDetail } from './line-detail';
import { Print } from './print';
import { cloneElement } from './registry';
import { Sound } from './sound';
import { StaffDetails } from './staff-details';
import { StaffTuning } from './staff-tuning';
import { attributesBackFrom, appliesToStaff, divisionsBackFrom } from './signature';
import { contentEnd } from './timeline';

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
    return this.closest(Part)?.measures.indexOf(this) ?? -1;
  }

  /**
   * The `<clef>` in effect at the start of this measure for `staff` (default
   * '1'): the nearest declaration at or before this measure. Clefs match their
   * staff exactly; a numberless key/time applies to every staff.
   */
  getClef(staff = '1'): Clef | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Clef).find((clef) => clef.staff === staff));
  }

  /** The `<key>` in effect at the start of this measure for `staff`. */
  getKey(staff = '1'): Key | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Key).find((key) => appliesToStaff(key, staff)));
  }

  /** The `<time>` in effect at the start of this measure for `staff`. */
  getTime(staff = '1'): Time | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Time).find((time) => appliesToStaff(time, staff)));
  }

  /** `<staves>` count in effect (global); 1 when never declared. */
  get staveCount(): number {
    const staves = this.attributeBack((attrs) => attrs.child('staves') ?? undefined);
    return staves?.text == null ? 1 : Number(staves.text);
  }

  /** `<staff-lines>` in effect for `staff` (default '1'); 5 lines when unspecified. */
  getStaveLines(staff = '1'): number {
    const lines = this.attributeBack((attrs) =>
      attrs
        .childrenNamed('staff-details')
        .filter((details) => appliesToStaff(details, staff))
        .map((details) => details.child('staff-lines'))
        .find((node) => node != null)
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
    return this.attributeBack((attrs) =>
      attrs.childrenOfType(StaffDetails).find((details) => appliesToStaff(details, staff))
    );
  }

  /**
   * The `<line-detail>` overrides in effect for `staff` (default '1'): the
   * per-line appearance from the nearest `<staff-details>`. Empty when that block
   * sets none, or when no `<staff-details>` applies.
   */
  getLineDetails(staff = '1'): LineDetail[] {
    return (
      this.attributeBack((attrs) => {
        const details = attrs.childrenNamed('staff-details').find((node) => appliesToStaff(node, staff));
        return details ? details.childrenOfType(LineDetail) : undefined;
      }) ?? []
    );
  }

  /**
   * The `<staff-tuning>` declarations in effect for `staff` (default '1'): the
   * string tunings from the nearest `<staff-details>`, which is what identifies a
   * tablature staff. Empty when that block declares none. Carry-forward, like
   * {@link getClef}.
   */
  getStaffTunings(staff = '1'): StaffTuning[] {
    return (
      this.attributeBack((attrs) => {
        const details = attrs.childrenNamed('staff-details').find((node) => appliesToStaff(node, staff));
        const tunings = details?.childrenOfType(StaffTuning);
        return tunings && tunings.length > 0 ? tunings : undefined;
      }) ?? []
    );
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
    for (let index = children.indexOf(firstNote); index < children.length; index++) {
      const node = children[index];
      if (!(node instanceof MElement) || node.tag !== 'attributes') {
        continue;
      }
      const clefs = node.childrenOfType(Clef).filter((clef) => clef.staff === staff);
      if (clefs.length === 0) {
        continue;
      }
      const beat = nextNoteFrom(children, index + 1)?.measureBeat ?? this.endBeat;
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
    return divisions == null || divisions === 0 ? 0 : contentEnd(this) / divisions;
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
    const fromDirections = this.directions.flatMap((direction) => (direction.sound ? [direction.sound] : []));
    return [...fromDirections, ...this.childrenOfType(Sound)];
  }

  /** The fretboard/chord diagrams (`<frame>`) carried by this measure's `<harmony>` elements. */
  get frames(): Frame[] {
    return this.harmonies.flatMap((harmony) => (harmony.frame ? [harmony.frame] : []));
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
   * Get or create the reader/writer for a `<voice>`; remembers the staff so notes
   * added through it are positioned and labeled correctly.
   */
  getOrCreateVoice(id: string, opts?: { staff?: string }): Voice {
    return new Voice(this, id, opts?.staff ?? '1');
  }

  /**
   * Upsert the `<clef>` in this measure's `<attributes>` (created and positioned
   * first if absent). The caller never assembles `<attributes>` by hand.
   */
  setClef(spec: { sign: string; line?: number; octaveChange?: number; staff?: string }): Clef {
    const attrs = attributesOf(this);
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
    attrs.append(clef);
    return clef;
  }

  /** Upsert the `<key>` in this measure's `<attributes>`. */
  setKey(spec: { fifths: number; mode?: string; staff?: string }): Key {
    const attrs = attributesOf(this);
    const number = spec.staff ?? null;
    attrs
      .childrenOfType(Key)
      .find((key) => key.getAttribute('number') === number)
      ?.remove();
    const key = new Key();
    if (spec.staff != null) {
      key.setAttribute('number', spec.staff);
    }
    appendValue(key, 'fifths', String(spec.fifths));
    if (spec.mode != null) {
      appendValue(key, 'mode', spec.mode);
    }
    attrs.append(key);
    return key;
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

  /** Upsert the `<time>` in this measure's `<attributes>`. */
  setTime(spec: { beats: number; beatType: number; symbol?: string }): Time {
    const attrs = attributesOf(this);
    attrs.childrenOfType(Time)[0]?.remove();
    const time = new Time();
    if (spec.symbol != null) {
      time.setAttribute('symbol', spec.symbol);
    }
    appendValue(time, 'beats', String(spec.beats));
    appendValue(time, 'beat-type', String(spec.beatType));
    attrs.append(time);
    return time;
  }

  /**
   * First `<attributes>` back from the start of this measure (own leading block,
   * then earlier measures) for which `pick` matches — the carry-forward shape.
   */
  private attributeBack<T>(pick: (attrs: MElement) => T | null | undefined): T | null {
    // "At the start of this measure": scan from the first note, so the measure's
    // own leading <attributes> count but a mid-measure change (after a note,
    // which only a note-level query should see) does not.
    const firstNote = this.notes[0];
    const fromIndex = firstNote ? this.children.indexOf(firstNote) : this.children.length;
    for (const attrs of attributesBackFrom(this, fromIndex)) {
      const found = pick(attrs);
      if (found != null) {
        return found;
      }
    }
    return null;
  }
}

/**
 * Get or create this measure's `<attributes>` block. Appended (so it lands first
 * when the measure is still empty, which is how scores are built — signatures
 * before notes); a later mid-measure change would need explicit positioning.
 */
export function attributesOf(measure: Measure): MElement {
  const existing = measure.childrenNamed('attributes')[0];
  if (existing) {
    return existing;
  }
  const attrs = new MElement('attributes');
  measure.append(attrs);
  return attrs;
}

/** Append a leaf `<tag>text</tag>` child to `parent`. */
export function appendValue(parent: MElement, tag: string, text: string): MElement {
  const element = new MElement(tag);
  element.append(new MText(text));
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
 * staff-details or transpose applies to EVERY staff — so nothing further back in
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
  const limit = firstNote ? measure.children.indexOf(firstNote) : measure.children.length;
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
  const staves = Array.from({ length: staveCount }, (_, index) => String(index + 1));
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
  const fromIndex = firstNote ? source.children.indexOf(firstNote) : source.children.length;
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
    (left, right) => left.tagRank - right.tagRank || left.staffRank - right.staffRank || left.index - right.index
  );
  for (const { node } of ranked) {
    block.append(node);
  }
}
