import { MElement, required } from './m-node';
import { Pitch } from './pitch';
import { Accidental } from './accidental';
import { Lyric } from './lyric';
import { Clef } from './clef';
import { Slur } from './slur';
import { Measure, appendValue } from './measure';
import { Part } from './part';
import { Key } from './key';
import { Time } from './time';
import { Tie } from './tie';
import { Beam } from './beam';
import { Tuplet } from './tuplet';
import { WavyLine } from './wavy-line';
import { HammerOn } from './hammer-on';
import { PullOff } from './pull-off';
import { Slide } from './slide';
import { Glissando } from './glissando';
import { attributesBackFrom, divisionsBackFrom, appliesToStaff } from './signature';
import { onsetOf, repairTimelineAfter } from './timeline';

/** MusicXML note-type values, coarsest to finest. */
export type NoteType = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th' | '128th';

/** MusicXML notehead-value enum: the glyph drawn for a note's head. */
export type NoteheadValue = 'normal' | 'x' | 'diamond' | 'slash' | 'triangle' | 'cross' | 'circle-x' | 'none';

/** A musical duration: a note type, optional dots, and an optional onset. */
export interface DurationSpec {
  type: NoteType;
  dots?: number;
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

// Fixed divisions mdom writes (PPQ). 2^8 makes every note type (down to 128th)
// and up to triple dots land on an integer <duration>; bump to a multiple of 3
// when tuplet writing arrives. ponytail: one constant beats adaptive rescaling.
export const WRITE_DIVISIONS = 256;

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
    const measure = this.closest(Measure);
    if (!measure) {
      return null;
    }
    for (const attrs of attributesBackFrom(measure, measure.children.indexOf(this))) {
      const clef = attrs.childrenOfType(Clef).find((candidate) => candidate.staff === this.staff);
      if (clef) {
        return clef;
      }
    }
    return null;
  }

  /** `<key>` in effect for this note's staff — same backward walk as {@link clef}. */
  get key(): Key | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Key).find((key) => appliesToStaff(key, this.staff)));
  }

  /** `<time>` in effect for this note's staff. */
  get time(): Time | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Time).find((time) => appliesToStaff(time, this.staff)));
  }

  /**
   * `<divisions>` in effect (global, not per-staff) — needed to read
   * `<duration>` as beats. Same backward walk, proving it generalizes.
   */
  get divisions(): number | null {
    const measure = this.closest(Measure);
    return measure ? divisionsBackFrom(measure, measure.children.indexOf(this)) : null;
  }

  /** `<staves>` count in effect (global, not per-staff); 1 when never declared. */
  get staveCount(): number {
    const found = this.attributeBack((attrs) => attrs.child('staves') ?? undefined);
    return found?.text == null ? 1 : Number(found.text);
  }

  /**
   * `<staff-details><staff-lines>` in effect for this note's staff; 5 (the
   * musical default) when never declared.
   */
  get staveLines(): number {
    const lines = this.attributeBack((attrs) =>
      attrs
        .childrenNamed('staff-details')
        .filter((details) => appliesToStaff(details, this.staff))
        .map((details) => details.child('staff-lines'))
        .find((node) => node != null)
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

  /** The `<voice>` this note belongs to; '1' when omitted, matching {@link staff}. */
  get voice(): string {
    return this.child('voice')?.text ?? '1';
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
    return this.childrenNamed('notations').flatMap((notations) => notations.childrenOfType(Slur));
  }

  /** `<tied>` markers in `<notations>`; each resolves its far end via partner(). */
  get ties(): Tie[] {
    return this.childrenNamed('notations').flatMap((notations) => notations.childrenOfType(Tie));
  }

  /** `<beam>` markers (one per level) directly under the note. */
  get beams(): Beam[] {
    return this.childrenOfType(Beam);
  }

  /** `<tuplet>` markers in `<notations>`. */
  get tuplets(): Tuplet[] {
    return this.childrenNamed('notations').flatMap((notations) => notations.childrenOfType(Tuplet));
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
   * `parentheses` is the `parentheses="yes"` attribute (a ghost note).
   */
  get notehead(): { value: NoteheadValue; parentheses: boolean } | null {
    const notehead = this.child('notehead');
    if (!notehead) {
      return null;
    }
    return {
      value: (notehead.text ?? 'normal') as NoteheadValue,
      parentheses: notehead.getAttribute('parentheses') === 'yes',
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
   * The `<notations><arpeggiate>` roll: outer null = no element; inner
   * `direction: null` = an undirected roll (element present, no `direction`
   * attribute) — a distinct rendering, so the two nulls stay separate.
   */
  get arpeggiate(): { direction: 'up' | 'down' | null } | null {
    const arpeggiate = this.notationsChild('arpeggiate');
    if (!arpeggiate) {
      return null;
    }
    const direction = arpeggiate.getAttribute('direction');
    return { direction: direction === 'up' || direction === 'down' ? direction : null };
  }

  /** Whether this is a slashed grace note (`<grace slash="yes"/>`, an acciaccatura). */
  get graceSlash(): boolean {
    return this.child('grace')?.getAttribute('slash') === 'yes';
  }

  /** Whether this note carries `<notations><technical><harmonic>`. */
  get isHarmonic(): boolean {
    return this.technicalChild('harmonic') !== null;
  }

  /**
   * The `<notations><technical><bend>`: `semitones` from `<bend-alter>` (2 = whole
   * step), `release` = presence of a `<release/>` child. Null when there is no bend.
   */
  get bend(): { semitones: number; release: boolean } | null {
    const bend = this.technicalChild('bend');
    if (!bend) {
      return null;
    }
    return {
      semitones: Number(bend.child('bend-alter')?.text ?? 0),
      release: bend.child('release') !== null,
    };
  }

  /** Text of each `<notations><technical><other-technical>` (free text like `P.M.`), document order. */
  get otherTechnical(): string[] {
    return this.technicalChildrenNamed('other-technical').map((node) => node.text ?? '');
  }

  /** `<stem>` direction (splits two voices on one stave; `none`/`double` are real values too); null when absent. */
  get stem(): 'up' | 'down' | 'double' | 'none' | null {
    const direction = this.child('stem')?.text;
    return direction === 'up' || direction === 'down' || direction === 'double' || direction === 'none'
      ? direction
      : null;
  }

  /**
   * The `<time-modification>` tuplet ratio (`actual-notes` : `normal-notes`, e.g.
   * 3:2 for a triplet), or null when this note isn't time-modified.
   */
  get timeModification(): { actual: number; normal: number } | null {
    const node = this.child('time-modification');
    const actual = node?.child('actual-notes')?.text;
    const normal = node?.child('normal-notes')?.text;
    if (actual == null || normal == null) {
      return null;
    }
    return { actual: Number(actual), normal: Number(normal) };
  }

  /** The `<lyric>` verses attached to this note, in document order (one per verse). */
  get lyrics(): Lyric[] {
    return this.childrenOfType(Lyric);
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

  /**
   * Replace this note's pitch in place (or give a rest one). The duration is
   * unchanged, so the timeline doesn't move and any attached slur/tie/beam — which
   * a remove-and-re-add would orphan — stays bound to this same note.
   */
  setPitch(spec: PitchSpec): void {
    const replacement = buildPitch(spec);
    const existing = this.child('pitch') ?? this.child('rest') ?? this.child('unpitched');
    if (existing) {
      this.replaceChild(existing, replacement);
    } else {
      this.insertBefore(replacement, this.child('duration') ?? this.child('voice'));
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
   * Change this note's notated duration (`type` + `dots`), recomputing `<duration>`
   * from the divisions in effect and rippling the rest of its voice. A sibling
   * voice is kept anchored by adjusting the `<backup>` between them.
   */
  setDuration(spec: { type: NoteType; dots?: number }): void {
    this.child('type')?.setText(spec.type);
    this.refreshDots(spec.dots ?? 0);
    const durationNode = this.child('duration');
    if (durationNode === null) {
      return; // a grace note carries no <duration>; only the notation changed
    }
    const divisions = required(this.divisions, 'divisions to recompute <duration>');
    const before = Number(durationNode.text ?? 0);
    const after = durationDivisions(spec, divisions);
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
    const afterType = type ? (this.children[this.children.indexOf(type) + 1] ?? null) : null;
    for (let index = 0; index < count; index++) {
      this.insertBefore(new MElement('dot'), afterType);
    }
  }

  /**
   * First `<attributes>` back from this note (nearest first) for which `pick`
   * returns a match — the shared shape of every carry-forward query.
   */
  private attributeBack<T>(pick: (attrs: MElement) => T | null | undefined): T | null {
    const measure = this.closest(Measure);
    if (!measure) {
      return null;
    }
    for (const attrs of attributesBackFrom(measure, measure.children.indexOf(this))) {
      const found = pick(attrs);
      if (found != null) {
        return found;
      }
    }
    return null;
  }

  /**
   * Add a note-attached spanner from this note to `other`, picking an unused
   * number across the part so the caller never manages pairing keys.
   */
  private spanTo<T extends MElement & { number: string }>(
    other: Note,
    Marker: new () => T,
    existing: (note: Note) => T[]
  ): T {
    const number = nextNumber(this, existing);
    const start = new Marker();
    start.setAttribute('type', 'start');
    start.setAttribute('number', number);
    this.notations().append(start);

    const stop = new Marker();
    stop.setAttribute('type', 'stop');
    stop.setAttribute('number', number);
    other.notations().append(stop);

    return start;
  }

  /** Get or create this note's `<notations>` child. */
  private notations(): MElement {
    const existing = this.childrenNamed('notations')[0];
    if (existing) {
      return existing;
    }
    const notations = new MElement('notations');
    this.append(notations);
    return notations;
  }

  /** First direct `<tag>` child across this note's `<notations>` blocks, or null. */
  private notationsChild(tag: string): MElement | null {
    return this.childrenNamed('notations').flatMap((notations) => notations.childrenNamed(tag))[0] ?? null;
  }

  /** Typed markers directly under this note's `<notations>` (e.g. slides, glissandos). */
  private notationsMarkers<T extends MElement>(type: new () => T): T[] {
    return this.childrenNamed('notations').flatMap((notations) => notations.childrenOfType(type));
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
  private technicalMarkers<T extends MElement>(type: new () => T): T[] {
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

/**
 * The lowest spanner number not already used by markers of this kind anywhere in
 * the part, so a generated start/stop pair can't collide with an existing span.
 */
function nextNumber(note: Note, existing: (note: Note) => { number: string }[]): string {
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
export function durationDivisions(spec: DurationSpec, divisions: number): number {
  let increment = QUARTER_BEATS[spec.type] * divisions;
  let total = increment;
  for (let dot = 0; dot < (spec.dots ?? 0); dot++) {
    increment /= 2;
    total += increment;
  }
  if (!Number.isInteger(total)) {
    throw new Error(
      `cannot represent ${spec.dots ?? 0}-dotted "${spec.type}" at divisions ${divisions}: fractional duration ${total}`
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
  for (let index = siblings.indexOf(element) + step; index >= 0 && index < siblings.length; index += step) {
    const node = siblings[index];
    if (node instanceof Note && !node.isChordMember) {
      return node;
    }
  }
  return null;
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
