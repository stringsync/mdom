import { MElement } from './m-node';
import { Note } from './note';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type TieType = 'start' | 'stop' | 'continue' | 'let-ring';

// A <tied> inside <notations> — the notated tie (distinct from the <tie> sound
// element). Paired start/stop by `number`, resolved on demand by partner(), the
// same shape every spanner uses.
export class Tie extends MElement {
  constructor() {
    super('tied');
  }

  // Pairing key; '1' when omitted.
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  get tieType(): TieType | null {
    return this.getAttribute('type') as TieType | null;
  }

  // The note this marker hangs off of.
  get note(): Note | null {
    return this.closest(Note);
  }

  // The marker at the other end (same number), scanning the part in document order.
  partner(): Tie | null {
    return resolvePartner(this, this.spec());
  }

  // All markers in this spanner (start..stop), not just the far end.
  members(): Tie[] {
    return resolveMembers(this, this.spec());
  }

  // Onset of this end within its measure, in beats.
  measureBeat(): number | null {
    return this.note?.measureBeat() ?? null;
  }

  private spec(): SpannerSpec<Tie> {
    return {
      siblings: noteMarkers(this, (note) => note.ties),
      isOpen: (tie) => tie.tieType === 'start' || tie.tieType === 'let-ring',
      isClose: (tie) => tie.tieType === 'stop',
    };
  }
}
