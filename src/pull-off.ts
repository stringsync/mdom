import { MElement, required } from './m-node';
import { Note } from './note';
import { Part } from './part';
import { Spanner, noteMarkers, type SpannerSpec } from './spanner';

export type PullOffType = 'start' | 'stop';

/**
 * A `<pull-off>` inside `<notations><technical>` — the guitar pull-off, the
 * mirror of {@link HammerOn}. A note-attached spanner: `start` on the fretted
 * note pairs with `stop` on the note pulled off to, joined by `number`.
 */
export class PullOff extends MElement {
  constructor() {
    super('pull-off');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<pull-off>` and drives pairing. */
  get pullOffType(): PullOffType {
    return required(this.getAttribute('type'), 'type on <pull-off>') as PullOffType;
  }

  /** The note this marker hangs off of. An attached marker always has one. */
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <pull-off>');
  }

  /** The part this marker belongs to. An attached marker always has one. */
  get part(): Part {
    return required(this.closest(Part), '<part> ancestor of <pull-off>');
  }

  /** The marker at the far end (same number), scanning the part in document order. */
  get partner(): PullOff | null {
    return new Spanner(this.spec()).partnerOf(this);
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): PullOff[] {
    return new Spanner(this.spec()).membersOf(this);
  }

  /** Onset of this marker's note within its measure, in beats. */
  get measureBeat(): number | null {
    return this.note.measureBeat;
  }

  private spec(): SpannerSpec<PullOff> {
    return {
      siblings: noteMarkers(this, (note) => note.pullOffs),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (marker) => marker.getAttribute('type') === 'start',
      isClose: (marker) => marker.getAttribute('type') === 'stop',
    };
  }
}
