import { MElement } from './m-node';
import { Direction } from './direction';
import { resolveMembers, resolvePartner, directionMarkers, type SpannerSpec } from './spanner';

export type WedgeType = 'crescendo' | 'diminuendo' | 'stop' | 'continue';

// A <wedge> (hairpin) under <direction-type>. Like every spanner it pairs
// start/stop by `number`, but it hangs off a <direction>, not a note — so its
// endpoint is `direction`, and its onset comes from measureBeat().
export class Wedge extends MElement {
  constructor() {
    super('wedge');
  }

  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  get wedgeType(): WedgeType | null {
    return this.getAttribute('type') as WedgeType | null;
  }

  // The <direction> this marker hangs off of (direction spanners have no note).
  get direction(): Direction | null {
    return this.closest(Direction);
  }

  partner(): Wedge | null {
    return resolvePartner(this, this.spec());
  }

  // All markers in this spanner (start..stop), not just the far end.
  members(): Wedge[] {
    return resolveMembers(this, this.spec());
  }

  measureBeat(): number | null {
    return this.direction?.measureBeat() ?? null;
  }

  private spec(): SpannerSpec<Wedge> {
    return {
      siblings: directionMarkers(this, (direction) => direction.wedges),
      isOpen: (wedge) => wedge.wedgeType === 'crescendo' || wedge.wedgeType === 'diminuendo',
      isClose: (wedge) => wedge.wedgeType === 'stop',
    };
  }
}
