import { MElement } from './m-node';
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

  get pedalType(): PedalType | null {
    return this.getAttribute('type') as PedalType | null;
  }

  get direction(): Direction | null {
    return this.closest(Direction);
  }

  partner(): Pedal | null {
    return resolvePartner(this, this.spec());
  }

  // All markers in this spanner (start..stop), not just the far end.
  members(): Pedal[] {
    return resolveMembers(this, this.spec());
  }

  measureBeat(): number | null {
    return this.direction?.measureBeat() ?? null;
  }

  private spec(): SpannerSpec<Pedal> {
    return {
      siblings: directionMarkers(this, (direction) => direction.pedals),
      isOpen: (pedal) => pedal.pedalType === 'start' || pedal.pedalType === 'sostenuto',
      isClose: (pedal) => pedal.pedalType === 'stop',
    };
  }
}
