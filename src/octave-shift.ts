import { MElement, required } from './m-node';
import { Direction } from './direction';
import { resolveMembers, resolvePartner, directionMarkers, type SpannerSpec } from './spanner';

export type OctaveShiftType = 'up' | 'down' | 'stop' | 'continue';

/**
 * An `<octave-shift>` (ottava) under `<direction-type>`. Direction-attached
 * spanner; `size` is 8/15/22, and it pairs by `number`.
 */
export class OctaveShift extends MElement {
  constructor() {
    super('octave-shift');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on an `<octave-shift>` and drives pairing. */
  get octaveShiftType(): OctaveShiftType {
    return required(this.getAttribute('type'), 'type on <octave-shift>') as OctaveShiftType;
  }

  /** Interval span: 8, 15, or 22. The MusicXML default for an absent size is 8. */
  get size(): number {
    return Number(this.getAttribute('size') ?? 8);
  }

  /** The `<direction>` this marker hangs off of. An attached marker always has one. */
  get direction(): Direction {
    return required(this.closest(Direction), '<direction> ancestor of <octave-shift>');
  }

  /** The marker at the far end (same number), or null. */
  get partner(): OctaveShift | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): OctaveShift[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's direction within its measure, in beats. */
  get measureBeat(): number | null {
    return this.direction.measureBeat;
  }

  private spec(): SpannerSpec<OctaveShift> {
    return {
      siblings: directionMarkers(this, (direction) => direction.octaveShifts),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (shift) => shift.getAttribute('type') === 'up' || shift.getAttribute('type') === 'down',
      isClose: (shift) => shift.getAttribute('type') === 'stop',
    };
  }
}
