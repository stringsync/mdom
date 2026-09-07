import { MElement } from './m-node';
import type { BeamValue } from './beam';
import type { NoteType } from './note';

/**
 * A `<metronome-note>`: one note of the note-group form of a metronome mark —
 * the "two beamed eighths = a triplet quarter-eighth" swing marking, where each
 * side of the equation is drawn as real notation rather than a `<beat-unit>`.
 */
export class MetronomeNote extends MElement {
  constructor() {
    super('metronome-note');
  }

  /** `<metronome-type>`; 'quarter' when absent. */
  get type(): NoteType {
    return (this.child('metronome-type')?.text ?? 'quarter') as NoteType;
  }

  /** `<metronome-dot/>` count. */
  get dots(): number {
    return this.childrenNamed('metronome-dot').length;
  }

  /** `<metronome-beam>` values, document order — how this note beams to its neighbors. */
  get beams(): BeamValue[] {
    return this.childrenNamed('metronome-beam').map((beam) => (beam.text ?? 'begin') as BeamValue);
  }

  /** `<metronome-tuplet>`: the ratio this note is compressed by, or null. */
  get tuplet(): { type: 'start' | 'stop'; actual: number; normal: number } | null {
    const tuplet = this.child('metronome-tuplet');
    if (!tuplet) {
      return null;
    }
    return {
      type: tuplet.getAttribute('type') === 'stop' ? 'stop' : 'start',
      actual: Number(tuplet.child('actual-notes')?.text ?? 0),
      normal: Number(tuplet.child('normal-notes')?.text ?? 0),
    };
  }
}

/**
 * A `<metronome>` under `<direction-type>`: the tempo mark. It comes in two
 * forms, and this class reads both. The `<beat-unit>` form states a rate
 * ("quarter = 120") or, with two units, a metric modulation ("dotted quarter =
 * half"). The `<metronome-note>` form draws both sides as notation, split by
 * `<metronome-relation>` — how a swing marking is written.
 */
export class Metronome extends MElement {
  constructor() {
    super('metronome');
  }

  /**
   * `<beat-unit>` values in document order, each with the `<beat-unit-dot/>`
   * count that trails it. Two entries = a metric modulation. MusicXML puts the
   * dots AFTER the unit they modify, so only this positional walk tells
   * "dotted quarter = half" from "quarter = dotted half".
   */
  get beatUnits(): Array<{ type: NoteType; dots: number }> {
    const units: Array<{ type: NoteType; dots: number }> = [];
    for (const child of this.children) {
      if (!(child instanceof MElement)) {
        continue;
      }
      if (child.tag === 'beat-unit') {
        units.push({ type: (child.text ?? 'quarter') as NoteType, dots: 0 });
      } else if (child.tag === 'beat-unit-dot') {
        const last = units[units.length - 1];
        if (last) {
          last.dots++;
        }
      }
    }
    return units;
  }

  /** `<per-minute>`, kept as a string (MusicXML allows "ca. 120"); null when absent. */
  get perMinute(): string | null {
    return this.child('per-minute')?.text ?? null;
  }

  /** The `parentheses="yes"` attribute — the mark is printed in brackets. */
  get parentheses(): boolean {
    return this.getAttribute('parentheses') === 'yes';
  }

  /**
   * The `<metronome-note>` form, split at `<metronome-relation>`: the notes drawn
   * left of the equals sign and the notes drawn right of it. Null when this
   * metronome is written in the `<beat-unit>` form instead.
   */
  get relation(): { left: MetronomeNote[]; right: MetronomeNote[] } | null {
    const left: MetronomeNote[] = [];
    const right: MetronomeNote[] = [];
    let side = left;
    for (const child of this.children) {
      if (!(child instanceof MElement)) {
        continue;
      }
      if (child.tag === 'metronome-relation') {
        side = right;
      } else if (child instanceof MetronomeNote) {
        side.push(child);
      }
    }
    return left.length === 0 && right.length === 0 ? null : { left, right };
  }
}
