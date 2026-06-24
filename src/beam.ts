import { MElement, required } from './m-node';
import { Note } from './note';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

/**
 * Collapse the per-note `<beam>` markers in `notes` into beamed runs — the same
 * fold {@link groupChords} does for `<chord/>`, but keyed on the level-1
 * begin/continue/end value. Each returned run is the ordered notes under one
 * beam, ready to map straight to a renderer's beam group. Unbeamed notes yield no
 * run; chord members are transparent (the beam is notated on the chord's lead),
 * so a run spanning a chord stays intact and carries only lead notes.
 */
export function groupBeams(notes: Note[]): Note[][] {
  const groups: Note[][] = [];
  let current: Note[] | null = null;
  for (const note of notes) {
    if (note.isChordMember) {
      continue;
    }
    const value = note.beams.find((beam) => beam.number === '1')?.beamValue;
    if (value === 'begin') {
      current = [note];
      groups.push(current);
    } else if (current && (value === 'continue' || value === 'end')) {
      current.push(note);
      if (value === 'end') {
        current = null;
      }
    } else {
      current = null;
    }
  }
  return groups;
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
