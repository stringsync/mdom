import { MElement } from './m-node';
import { Note } from './note';
import { Part } from './part';

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

  get slurType(): SlurType | null {
    return this.getAttribute('type') as SlurType | null;
  }

  get placement(): string | null {
    return this.getAttribute('placement');
  }

  // The note this marker hangs off of.
  get note(): Note | null {
    return this.closest(Note);
  }

  // The marker at the other end, found by scanning the part in document order
  // for the nearest matching start/stop with the same `number`. Reused numbers
  // resolve correctly: the first stop after a start is its match, because a
  // number can't reopen until it closes. Spans measures (and systems) for free.
  partner(): Slur | null {
    const part = this.closest(Part);
    if (!part) {
      return null;
    }
    const markers = part.measures.flatMap((m) => m.notes).flatMap((n) => n.slurs);
    const self = markers.indexOf(this);
    if (self < 0) {
      return null;
    }
    if (this.slurType === 'start') {
      for (let i = self + 1; i < markers.length; i++) {
        if (markers[i].number === this.number && markers[i].slurType === 'stop') {
          return markers[i];
        }
      }
    } else if (this.slurType === 'stop') {
      for (let i = self - 1; i >= 0; i--) {
        if (markers[i].number === this.number && markers[i].slurType === 'start') {
          return markers[i];
        }
      }
    }
    return null;
  }
}
