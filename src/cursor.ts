import { required } from './m-node';
import { Part } from './part';
import { Measure } from './measure';
import { Note } from './note';
import type { Voice } from './voice';

/**
 * An immutable timeline caret: a position `(measure, voice, onset-in-beats)` in a
 * score. Movement returns a NEW cursor — the original keeps pointing where it
 * did, so two carets can be held at once (a selection's start and end, a slur's
 * two endpoints). The position is a coordinate, not a node reference: {@link note}
 * is looked up live from the tree on each access, so an edit elsewhere never
 * stales the cursor, and it's null when the caret sits on a gap or past the
 * voice's last note (the append point).
 *
 * Selecting non-notes (a measure to set its width, a slur to reshape it) isn't a
 * caret move: the cursor only locates the object via {@link measure}/{@link note}
 * and the edit happens on that node directly (`cursor.measure.width = …`).
 */
export class Cursor {
  constructor(
    readonly measure: Measure,
    readonly voiceId: string,
    readonly staff: string,
    /** Onset within the measure, in quarter-note beats. */
    readonly onset: number
  ) {}

  /** A caret on a specific note (its measure, voice, and onset). */
  static at(note: Note): Cursor;
  /** A caret at `beat` within a voice (default the voice start). */
  static at(voice: Voice, beat?: number): Cursor;
  static at(target: Note | Voice, beat = 0): Cursor {
    if (target instanceof Note) {
      const measure = required(target.closest(Measure), '<measure> ancestor for cursor');
      const onset = required(target.measureBeat, 'measureBeat for cursor');
      return new Cursor(measure, target.voice, target.staff, onset);
    }
    return new Cursor(target.measure, target.id, target.staff, beat);
  }

  /** The voice this caret sits in (reader + writer). */
  get voice(): Voice {
    return this.measure.getOrCreateVoice(this.voiceId, { staff: this.staff });
  }

  /**
   * The note starting at this onset in this voice (the lead note of a chord), or
   * null on a gap or past the last note. Recomputed from the tree each access.
   */
  get note(): Note | null {
    // ponytail: exact beat match. A hand-passed fractional onset (e.g. a triplet
    // via voice.cursor(1/3)) must equal measureBeat() bit-for-bit; epsilon-compare
    // if that bites. Cursors from next()/prev()/note.cursor() store the note's own
    // measureBeat(), so they always match.
    return this.stopsIn(this.measure).find((note) => note.measureBeat === this.onset) ?? null;
  }

  /**
   * The caret on the next note in this voice, crossing into the next measure's
   * same voice when at the end; null past the last note of the part.
   */
  next(): Cursor | null {
    const later = this.stopsIn(this.measure).find((note) => (note.measureBeat ?? 0) > this.onset);
    if (later) {
      return Cursor.at(later);
    }
    for (const measure of this.measuresFrom(1)) {
      const first = this.stopsIn(measure)[0];
      if (first) {
        return Cursor.at(first);
      }
    }
    return null;
  }

  /**
   * The caret on the previous note in this voice, crossing into the previous
   * measure's same voice; null before the first note of the part.
   */
  prev(): Cursor | null {
    const earlier = this.stopsIn(this.measure).filter((note) => (note.measureBeat ?? 0) < this.onset);
    if (earlier.length > 0) {
      return Cursor.at(earlier[earlier.length - 1]!);
    }
    for (const measure of this.measuresFrom(-1)) {
      const stops = this.stopsIn(measure);
      if (stops.length > 0) {
        return Cursor.at(stops[stops.length - 1]!);
      }
    }
    return null;
  }

  /** The lead notes (chord heads) of this voice in `measure`, in onset order. */
  private stopsIn(measure: Measure): Note[] {
    return measure.getOrCreateVoice(this.voiceId, { staff: this.staff }).chords.map((chord) => chord.notes[0]!);
  }

  /** This part's measures stepping out from the current one: +1 forward, -1 back (nearest first). */
  private measuresFrom(step: 1 | -1): Measure[] {
    const measures = this.measure.closest(Part)?.measures ?? [];
    const index = measures.indexOf(this.measure);
    return step > 0 ? measures.slice(index + 1) : measures.slice(0, index).reverse();
  }
}
