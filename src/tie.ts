import { MElement, required } from './m-node';
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

  // `type` is required on a <tied> and drives pairing.
  get tieType(): TieType {
    return required(this.getAttribute('type'), 'type on <tied>') as TieType;
  }

  // The note this marker hangs off of. An attached marker always has one.
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <tied>');
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
    return this.note.measureBeat();
  }

  private spec(): SpannerSpec<Tie> {
    return {
      siblings: noteMarkers(this, (note) => note.ties),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (tie) => tie.getAttribute('type') === 'start' || tie.getAttribute('type') === 'let-ring',
      isClose: (tie) => tie.getAttribute('type') === 'stop',
    };
  }
}
