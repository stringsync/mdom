import { MElement, required } from './m-node';
import { Direction } from './direction';
import { resolveMembers, resolvePartner, directionMarkers, type SpannerSpec } from './spanner';

export type WedgeType = 'crescendo' | 'diminuendo' | 'stop' | 'continue';

/**
 * A `<wedge>` (hairpin) under `<direction-type>`. Like every spanner it pairs
 * start/stop by `number`, but it hangs off a `<direction>`, not a note — so its
 * endpoint is {@link direction}, and its onset comes from {@link measureBeat}.
 */
export class Wedge extends MElement {
  constructor() {
    super('wedge');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<wedge>` and drives pairing. */
  get wedgeType(): WedgeType {
    return required(this.getAttribute('type'), 'type on <wedge>') as WedgeType;
  }

  /**
   * The `<direction>` this marker hangs off of (direction spanners have no note);
   * an attached marker always has one.
   */
  get direction(): Direction {
    return required(this.closest(Direction), '<direction> ancestor of <wedge>');
  }

  /** The marker at the far end (same number), or null. */
  get partner(): Wedge | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Wedge[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's direction within its measure, in beats. */
  get measureBeat(): number | null {
    return this.direction.measureBeat;
  }

  private spec(): SpannerSpec<Wedge> {
    return {
      siblings: directionMarkers(this, (direction) => direction.wedges),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (wedge) => wedge.getAttribute('type') === 'crescendo' || wedge.getAttribute('type') === 'diminuendo',
      isClose: (wedge) => wedge.getAttribute('type') === 'stop',
    };
  }
}
