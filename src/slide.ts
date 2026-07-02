import { MElement, required } from './m-node';
import { Note } from './note';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type SlideType = 'start' | 'stop';

/**
 * A `<slide>` inside `<notations>` — a fretboard slide with an audible glide
 * between the two pitches. A note-attached spanner: `start` on the departing
 * note pairs with `stop` on the arriving note by `number`; the pair can cross a
 * barline, so {@link partner} scans the whole part like {@link Slur}. Kept a
 * distinct class from {@link Glissando} even though renderers often draw them
 * alike, so the notational distinction survives the round-trip.
 */
export class Slide extends MElement {
  constructor() {
    super('slide');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<slide>` and drives pairing. */
  get slideType(): SlideType {
    return required(this.getAttribute('type'), 'type on <slide>') as SlideType;
  }

  /** The note this marker hangs off of. An attached marker always has one. */
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <slide>');
  }

  /** The marker at the far end (same number), scanning the part in document order. */
  get partner(): Slide | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Slide[] {
    return resolveMembers(this, this.spec());
  }

  private spec(): SpannerSpec<Slide> {
    return {
      siblings: noteMarkers(this, (note) => note.slides),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (marker) => marker.getAttribute('type') === 'start',
      isClose: (marker) => marker.getAttribute('type') === 'stop',
    };
  }
}
