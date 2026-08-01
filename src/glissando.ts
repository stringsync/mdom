import { MElement, required } from './m-node';
import { Note } from './note';
import { Part } from './part';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type GlissandoType = 'start' | 'stop';

/**
 * A `<glissando>` inside `<notations>` — a glide between two pitches, the sibling
 * of {@link Slide}. A note-attached spanner: `start` pairs with `stop` by
 * `number`, resolved across measures by {@link partner}. Kept separate from
 * {@link Slide} so the tag distinction survives even where they render alike.
 */
export class Glissando extends MElement {
  constructor() {
    super('glissando');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<glissando>` and drives pairing. */
  get glissandoType(): GlissandoType {
    return required(this.getAttribute('type'), 'type on <glissando>') as GlissandoType;
  }

  /** `line-type` (solid/dashed/dotted/wavy) — the stroke to draw; null when unstated. */
  get lineType(): string | null {
    return this.getAttribute('line-type');
  }

  /** The note this marker hangs off of. An attached marker always has one. */
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <glissando>');
  }

  /** The part this marker belongs to. An attached marker always has one. */
  get part(): Part {
    return required(this.closest(Part), '<part> ancestor of <glissando>');
  }

  /** The marker at the far end (same number), scanning the part in document order. */
  get partner(): Glissando | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Glissando[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's note within its measure, in beats. */
  get measureBeat(): number | null {
    return this.note.measureBeat;
  }

  private spec(): SpannerSpec<Glissando> {
    return {
      siblings: noteMarkers(this, (note) => note.glissandos),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (marker) => marker.getAttribute('type') === 'start',
      isClose: (marker) => marker.getAttribute('type') === 'stop',
    };
  }
}
