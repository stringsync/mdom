import { MElement, required } from './m-node';
import { Direction } from './direction';
import { Measure } from './measure';
import { resolveMembers, resolvePartner, directionMarkers, type SpannerSpec } from './spanner';

export type DashesType = 'start' | 'stop' | 'continue';

/**
 * A `<dashes>` under `<direction-type>`: the dashed line trailing a "cresc." or a
 * "rit." out to where the instruction stops applying. A direction-attached
 * spanner like {@link Wedge} and {@link Bracket}; both ends bind to
 * {@link Direction.nextNote}.
 */
export class Dashes extends MElement {
  constructor() {
    super('dashes');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<dashes>` and drives pairing. */
  get dashesType(): DashesType {
    return required(this.getAttribute('type'), 'type on <dashes>') as DashesType;
  }

  /** The `<direction>` this marker hangs off of. An attached marker always has one. */
  get direction(): Direction {
    return required(this.closest(Direction), '<direction> ancestor of <dashes>');
  }

  /** The measure this marker sits in. An attached marker always has one. */
  get measure(): Measure {
    return required(this.closest(Measure), '<measure> ancestor of <dashes>');
  }

  /** The marker at the far end (same number), or null. */
  get partner(): Dashes | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Dashes[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's direction within its measure, in beats. */
  get measureBeat(): number | null {
    return this.direction.measureBeat;
  }

  private spec(): SpannerSpec<Dashes> {
    return {
      siblings: directionMarkers(this, (direction) => direction.dashes),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (marker) => marker.getAttribute('type') === 'start',
      isClose: (marker) => marker.getAttribute('type') === 'stop',
    };
  }
}
