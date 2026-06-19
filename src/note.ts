import { MElement } from './m-node';
import { Pitch } from './pitch';

// A single note. Chords, ties, beams, slurs, voice/staff grouping, and the
// backup/forward timeline are intentionally not modeled here: they round-trip
// as plain child MElements and belong to a later projection/edit layer.
export class Note extends MElement {
  constructor() {
    super('note');
  }

  get isRest(): boolean {
    return this.child('rest') !== null;
  }

  get pitch(): Pitch | null {
    return this.childrenOfType(Pitch)[0] ?? null; // null for rests / unpitched
  }

  get duration(): number | null {
    const duration = this.child('duration')?.text;
    return duration == null ? null : Number(duration);
  }

  get type(): string | null {
    return this.child('type')?.text ?? null;
  }
}
