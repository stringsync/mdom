import { MElement, required } from './m-node';
import { Note } from './note';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type TupletType = 'start' | 'stop';

/**
 * A `<tuplet>` inside `<notations>` (the bracket/number). The ratio itself lives
 * in the note's `<time-modification>`; this marks where the group starts and stops.
 */
export class Tuplet extends MElement {
  constructor() {
    super('tuplet');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<tuplet>` and drives pairing. */
  get tupletType(): TupletType {
    return required(this.getAttribute('type'), 'type on <tuplet>') as TupletType;
  }

  /** The note this marker hangs off of. An attached marker always has one. */
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <tuplet>');
  }

  /** The marker at the far end (same number), or null. */
  get partner(): Tuplet | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Tuplet[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's note within its measure, in beats. */
  get measureBeat(): number | null {
    return this.note.measureBeat;
  }

  private spec(): SpannerSpec<Tuplet> {
    return {
      siblings: noteMarkers(this, (note) => note.tuplets),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (tuplet) => tuplet.getAttribute('type') === 'start',
      isClose: (tuplet) => tuplet.getAttribute('type') === 'stop',
    };
  }
}
