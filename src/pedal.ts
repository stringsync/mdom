import { MElement, required } from './m-node';
import { Direction } from './direction';
import { resolveMembers, resolvePartner, directionMarkers, type SpannerSpec } from './spanner';

export type PedalType = 'start' | 'stop' | 'change' | 'continue' | 'sostenuto';

// A <pedal> under <direction-type>. Direction-attached spanner; pairs by `number`.
export class Pedal extends MElement {
  constructor() {
    super('pedal');
  }

  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  // `type` is required on a <pedal> and drives pairing.
  get pedalType(): PedalType {
    return required(this.getAttribute('type'), 'type on <pedal>') as PedalType;
  }

  // An attached marker always has its direction.
  get direction(): Direction {
    return required(this.closest(Direction), '<direction> ancestor of <pedal>');
  }

  partner(): Pedal | null {
    return resolvePartner(this, this.spec());
  }

  // All markers in this spanner (start..stop), not just the far end.
  members(): Pedal[] {
    return resolveMembers(this, this.spec());
  }

  measureBeat(): number | null {
    return this.direction.measureBeat();
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
