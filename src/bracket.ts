import { MElement, required } from './m-node';
import { Direction } from './direction';
import { Measure } from './measure';
import { resolveMembers, resolvePartner, directionMarkers, type SpannerSpec } from './spanner';

export type BracketType = 'start' | 'stop' | 'continue';

/**
 * A `<bracket>` under `<direction-type>`: the horizontal bracket that marks off a
 * phrase or an analytical span. A direction-attached spanner, exactly like
 * {@link Wedge} — it pairs start/stop by `number` and crosses barlines freely.
 *
 * Binding differs from a pedal's: both ends bind to {@link Direction.nextNote},
 * because a bracket's stop marks the moment the passage ends and MusicXML writes
 * it before the last note it covers.
 */
export class Bracket extends MElement {
  constructor() {
    super('bracket');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<bracket>` and drives pairing. */
  get bracketType(): BracketType {
    return required(this.getAttribute('type'), 'type on <bracket>') as BracketType;
  }

  /**
   * `line-end`: how this end terminates — a hook up, a hook down, an arrow, or
   * nothing. Required by the spec; 'none' when a malformed marker omits it.
   */
  get lineEnd(): 'up' | 'down' | 'arrow' | 'none' {
    const lineEnd = this.getAttribute('line-end');
    return lineEnd === 'up' || lineEnd === 'down' || lineEnd === 'arrow' ? lineEnd : 'none';
  }

  /** `line-type` (solid/dashed/dotted/wavy); null when unstated. */
  get lineType(): string | null {
    return this.getAttribute('line-type');
  }

  /** The `<direction>` this marker hangs off of. An attached marker always has one. */
  get direction(): Direction {
    return required(this.closest(Direction), '<direction> ancestor of <bracket>');
  }

  /** The measure this marker sits in. An attached marker always has one. */
  get measure(): Measure {
    return required(this.closest(Measure), '<measure> ancestor of <bracket>');
  }

  /** The marker at the far end (same number), or null. */
  get partner(): Bracket | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Bracket[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's direction within its measure, in beats. */
  get measureBeat(): number | null {
    return this.direction.measureBeat;
  }

  private spec(): SpannerSpec<Bracket> {
    return {
      siblings: directionMarkers(this, (direction) => direction.brackets),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (marker) => marker.getAttribute('type') === 'start',
      isClose: (marker) => marker.getAttribute('type') === 'stop',
    };
  }
}
