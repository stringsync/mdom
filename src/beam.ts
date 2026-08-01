import { MElement, required } from './m-node';
import { Note } from './note';
import { Part } from './part';
import { colorOf } from './print-style';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

/**
 * One beamed run: the notes under a single primary beam, plus where its
 * secondary beams break. `breaksAfter` holds indexes into `notes` — a sub-beam
 * split falls between `notes[index]` and `notes[index + 1]`.
 */
export interface BeamRun {
  notes: Note[];
  breaksAfter: number[];
}

/**
 * Collapse the per-note `<beam>` markers in `notes` into beamed runs — the same
 * fold {@link groupChords} does for `<chord/>`, but keyed on the level-1
 * begin/continue/end value. Chord members are transparent (the beam is notated on
 * the chord's lead), so a run spanning a chord stays intact and carries only lead
 * notes; so are rests carrying no beam markers, which sit under a beam without
 * breaking it.
 *
 * A level-1 `end` does NOT close the run — only a new `begin`, or a note that
 * isn't beamed at all, does. Guitar Pro writes a triplet-of-16ths + 2-16ths beat
 * as `begin, continue, end, continue, end`: one continuous primary beam with a
 * sub-beam split in the middle. Closing at the first `end` would leave the
 * trailing notes flagged. Those splits come back as {@link BeamRun.breaksAfter}:
 * a secondary-level `end` that isn't the run's last note.
 */
export function groupBeamRuns(notes: Note[]): BeamRun[] {
  const runs: BeamRun[] = [];
  let current: BeamRun | null = null;
  for (const note of notes) {
    if (note.isChordMember) {
      continue;
    }
    // Raw text reads so the fold tolerates a malformed valueless marker.
    const beams = note.beams;
    const value = beams.find((beam) => beam.number === '1')?.text ?? null;
    if (value === 'begin') {
      current = { notes: [note], breaksAfter: [] };
      runs.push(current);
    } else if (value !== null) {
      current?.notes.push(note); // continue / end / a hook, all of them joiners
    } else if (beams.length === 0 && note.isRest) {
      continue; // a rest can sit under a beam
    } else {
      current = null;
      continue;
    }
    if (current && beams.some((beam) => beam.number !== '1' && beam.text === 'end')) {
      current.breaksAfter.push(current.notes.length - 1);
    }
  }
  for (const run of runs) {
    // A secondary end on the LAST note is where the whole beam stops, not a split.
    run.breaksAfter = run.breaksAfter.filter((index) => index < run.notes.length - 1);
  }
  return runs;
}

/** The notes of each beamed run — {@link groupBeamRuns} without the break positions. */
export function groupBeams(notes: Note[]): Note[][] {
  return groupBeamRuns(notes).map((run) => run.notes);
}

export type BeamValue = 'begin' | 'continue' | 'end' | 'forward hook' | 'backward hook';

/**
 * A `<beam>` directly under `<note>`. `number` is the beam level (1 = eighth-note
 * beam, 2 = sixteenth, ...); each level pairs begin/end like any spanner. The
 * value is element text, not an attribute.
 */
export class Beam extends MElement {
  constructor() {
    super('beam');
  }

  /** Beam level; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** The begin/continue/end value: required text on a `<beam>`, and drives pairing. */
  get beamValue(): BeamValue {
    return required(this.text, 'value of <beam>') as BeamValue;
  }

  /** The note this marker hangs off of. An attached marker always has one. */
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <beam>');
  }

  /** The part this marker belongs to. An attached marker always has one. */
  get part(): Part {
    return required(this.closest(Part), '<part> ancestor of <beam>');
  }

  /** The normalized `color`; null when unset. */
  get color(): string | null {
    return colorOf(this);
  }

  /** The marker at the far end (same number), or null. */
  get partner(): Beam | null {
    return resolvePartner(this, this.spec());
  }

  /**
   * Every marker in this spanner in order — begin, any continues, end.
   * {@link partner} is just the far end; {@link members} is the whole span (e.g. a
   * 3-note beam group).
   */
  get members(): Beam[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's note within its measure, in beats. */
  get measureBeat(): number | null {
    return this.note.measureBeat;
  }

  private spec(): SpannerSpec<Beam> {
    return {
      siblings: noteMarkers(this, (note) => note.beams),
      // Raw text reads so resolution tolerates a malformed valueless marker.
      isOpen: (beam) => beam.text === 'begin',
      isClose: (beam) => beam.text === 'end',
    };
  }
}
