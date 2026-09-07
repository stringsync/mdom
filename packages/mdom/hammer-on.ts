import { MElement, required } from './m-node';
import { Note } from './note';
import { Part } from './part';
import { Spanner, noteMarkers, type SpannerSpec } from './spanner';

export type HammerOnType = 'start' | 'stop';

/**
 * A `<hammer-on>` inside `<notations><technical>` — the guitar hammer-on. A
 * note-attached spanner: a `start` on the plucked note pairs with a `stop` on
 * the hammered note, joined by `number`, resolved on demand by {@link partner}.
 */
export class HammerOn extends MElement {
  constructor() {
    super('hammer-on');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<hammer-on>` and drives pairing. */
  get hammerOnType(): HammerOnType {
    return required(this.getAttribute('type'), 'type on <hammer-on>') as HammerOnType;
  }

  /** The note this marker hangs off of. An attached marker always has one. */
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <hammer-on>');
  }

  /** The part this marker belongs to. An attached marker always has one. */
  get part(): Part {
    return required(this.closest(Part), '<part> ancestor of <hammer-on>');
  }

  /** The marker at the far end (same number), scanning the part in document order. */
  get partner(): HammerOn | null {
    return new Spanner(this.spec()).partnerOf(this);
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): HammerOn[] {
    return new Spanner(this.spec()).membersOf(this);
  }

  /** Onset of this marker's note within its measure, in beats. */
  get measureBeat(): number | null {
    return this.note.measureBeat;
  }

  private spec(): SpannerSpec<HammerOn> {
    return {
      siblings: noteMarkers(this, (note) => note.hammerOns),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (marker) => marker.getAttribute('type') === 'start',
      isClose: (marker) => marker.getAttribute('type') === 'stop',
    };
  }
}
