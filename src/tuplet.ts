import { MElement } from './m-node';
import { Note } from './note';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type TupletType = 'start' | 'stop';

// A <tuplet> inside <notations> (the bracket/number). The ratio itself lives in
// the note's <time-modification>; this marks where the group starts and stops.
export class Tuplet extends MElement {
  constructor() {
    super('tuplet');
  }

  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  get tupletType(): TupletType | null {
    return this.getAttribute('type') as TupletType | null;
  }

  get note(): Note | null {
    return this.closest(Note);
  }

  partner(): Tuplet | null {
    return resolvePartner(this, this.spec());
  }

  // All markers in this spanner (start..stop), not just the far end.
  members(): Tuplet[] {
    return resolveMembers(this, this.spec());
  }

  measureBeat(): number | null {
    return this.note?.measureBeat() ?? null;
  }

  private spec(): SpannerSpec<Tuplet> {
    return {
      siblings: noteMarkers(this, (note) => note.tuplets),
      isOpen: (tuplet) => tuplet.tupletType === 'start',
      isClose: (tuplet) => tuplet.tupletType === 'stop',
    };
  }
}
