import { MElement, required } from './m-node';
import { Pitch } from './pitch';
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
import { attributesBackFrom, divisionsBackFrom, appliesToStaff } from './signature';
import { onsetOf, repairTimelineAfter } from './timeline';

/** MusicXML note-type values, coarsest to finest. */
export type NoteType = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th' | '128th';

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

  /** `<duration>` in divisions; null for grace notes, which carry none (see {@link isGrace}). */
  get duration(): number | null {
    const duration = this.child('duration')?.text;
    return duration == null ? null : Number(duration);
  }

  /** The notated `<type>` (whole/half/quarter/...), or null. */
  get type(): string | null {
    return this.child('type')?.text ?? null;
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
  clef(): Clef | null {
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
  key(): Key | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Key).find((key) => appliesToStaff(key, this.staff)));
  }

  /** `<time>` in effect for this note's staff. */
  time(): Time | null {
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
  staveCount(): number {
    const found = this.attributeBack((attrs) => attrs.child('staves') ?? undefined);
    return found?.text == null ? 1 : Number(found.text);
  }

  /**
   * `<staff-details><staff-lines>` in effect for this note's staff; 5 (the
   * musical default) when never declared.
   */
  staveLines(): number {
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
  measureBeat(): number | null {
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
   * and begins another). Each resolves its far end via `partner()`.
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

  /**
   * Slur this note to `other`: mdom picks an unused slur number and adds the
   * paired `<slur start>`/`<slur stop>` markers (creating `<notations>` as needed).
   */
  slurTo(other: Note): Slur {
    return this.spanTo(other, Slur, (note) => note.slurs);
  }

  /** Tie this note to `other`, added as paired `<tied start>`/`<tied stop>` markers. */
  tieTo(other: Note): Tie {
    return this.spanTo(other, Tie, (note) => note.ties);
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
  makeRest(): void {
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
  makeGrace(): void {
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
