import { MElement } from './m-node';
import { Direction } from './direction';
import { resolveMembers, resolvePartner, directionMarkers, type SpannerSpec } from './spanner';

export type OctaveShiftType = 'up' | 'down' | 'stop' | 'continue';

// An <octave-shift> (ottava) under <direction-type>. Direction-attached spanner;
// `size` is 8/15/22, and it pairs by `number`.
export class OctaveShift extends MElement {
  constructor() {
    super('octave-shift');
  }

  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  get octaveShiftType(): OctaveShiftType | null {
    return this.getAttribute('type') as OctaveShiftType | null;
  }

  // Interval span: 8, 15, or 22.
  get size(): number | null {
    const size = this.getAttribute('size');
    return size == null ? null : Number(size);
  }

  get direction(): Direction | null {
    return this.closest(Direction);
  }

  partner(): OctaveShift | null {
    return resolvePartner(this, this.spec());
  }

  // All markers in this spanner (start..stop), not just the far end.
  members(): OctaveShift[] {
    return resolveMembers(this, this.spec());
  }

  measureBeat(): number | null {
    return this.direction?.measureBeat() ?? null;
  }

  private spec(): SpannerSpec<OctaveShift> {
    return {
      siblings: directionMarkers(this, (direction) => direction.octaveShifts),
      isOpen: (shift) => shift.octaveShiftType === 'up' || shift.octaveShiftType === 'down',
      isClose: (shift) => shift.octaveShiftType === 'stop',
    };
  }
}
