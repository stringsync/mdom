import { MElement } from './m-node';
import { Pitch } from './pitch';
import { Clef } from './clef';
import { Slur } from './slur';
import { Measure } from './measure';
import { Part } from './part';
import { Key } from './key';
import { Time } from './time';
import { Tie } from './tie';
import { Beam } from './beam';
import { Tuplet } from './tuplet';
import { WavyLine } from './wavy-line';
import { attributesBackFrom, divisionsBackFrom, appliesToStaff } from './signature';
import { onsetOf } from './timeline';

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
