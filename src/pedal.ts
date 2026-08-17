import { MElement, required } from './m-node';
import { Direction } from './direction';
import { Measure } from './measure';
import { Spanner, directionMarkers, type SpannerSpec } from './spanner';

export type PedalType = 'start' | 'stop' | 'change' | 'continue' | 'sostenuto';

/** A `<pedal>` under `<direction-type>`. Direction-attached spanner; pairs by `number`. */
export class Pedal extends MElement {
  constructor() {
    super('pedal');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<pedal>` and drives pairing. */
  get pedalType(): PedalType {
    return required(this.getAttribute('type'), 'type on <pedal>') as PedalType;
  }

  /** The `<direction>` this marker hangs off of. An attached marker always has one. */
  get direction(): Direction {
    return required(this.closest(Direction), '<direction> ancestor of <pedal>');
  }

  /** The measure this marker sits in. An attached marker always has one. */
  get measure(): Measure {
    return required(this.closest(Measure), '<measure> ancestor of <pedal>');
  }

  /** The `line="yes"` attribute: a bracket-style pedal line vs. the default `Ped…*` signs. */
  get line(): boolean {
    return this.getAttribute('line') === 'yes';
  }

  /** The marker at the far end (same number), or null. */
  get partner(): Pedal | null {
    return new Spanner(this.spec()).partnerOf(this);
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Pedal[] {
    return new Spanner(this.spec()).membersOf(this);
  }

  /** Onset of this marker's direction within its measure, in beats. */
  get measureBeat(): number | null {
    return this.direction.measureBeat;
  }

  private spec(): SpannerSpec<Pedal> {
    return {
      siblings: directionMarkers(this, (direction) => direction.pedals),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (pedal) => pedal.getAttribute('type') === 'start' || pedal.getAttribute('type') === 'sostenuto',
      isClose: (pedal) => pedal.getAttribute('type') === 'stop',
    };
  }
}
