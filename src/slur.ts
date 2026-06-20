import { MElement, required } from './m-node';
import { Note } from './note';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type SlurType = 'start' | 'stop' | 'continue';

// A <slur> marker inside <notations>. Slurs — like ties, wedges, pedals, and
// every other spanner — are NOT tree-shaped: a `start` on one note pairs with a
// `stop` on a later note, joined by `number`. The pairing is resolved on demand
// by `partner()`, not accumulated into ids by a begin/continue/close walk.
export class Slur extends MElement {
  constructor() {
    super('slur');
  }

  // Pairing key. MusicXML treats an absent slur number as 1.
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  // `type` is required on a <slur> and drives pairing; absence is a malformed
  // marker, not an expected state.
  get slurType(): SlurType {
    return required(this.getAttribute('type'), 'type on <slur>') as SlurType;
  }

  get placement(): string | null {
    return this.getAttribute('placement');
  }

  // The note this marker hangs off of. An attached marker always has one.
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <slur>');
  }

  // The marker at the other end, found by scanning the part in document order for
  // the nearest matching start/stop with the same `number`. Reused numbers
  // resolve correctly: the first stop after a start is its match, because a
  // number can't reopen until it closes. Spans measures (and systems) for free.
  partner(): Slur | null {
    return resolvePartner(this, this.spec());
  }

  // All markers in this spanner (start..stop), not just the far end.
  members(): Slur[] {
    return resolveMembers(this, this.spec());
  }

  private spec(): SpannerSpec<Slur> {
    return {
      siblings: noteMarkers(this, (note) => note.slurs),
      // Raw reads so resolution tolerates a malformed typeless marker (skips it)
      // rather than throwing through the strict `slurType` getter.
      isOpen: (slur) => slur.getAttribute('type') === 'start',
      isClose: (slur) => slur.getAttribute('type') === 'stop',
    };
  }
}
