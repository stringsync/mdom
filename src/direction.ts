import { MElement } from './m-node';
import { Measure } from './measure';
import { Wedge } from './wedge';
import { Pedal } from './pedal';
import { OctaveShift } from './octave-shift';
import { onsetOf } from './timeline';
import { divisionsBackFrom } from './signature';

// A <direction>: an instruction attached to a point in the timeline, with no
// <duration> of its own. This pass exposes only the spanners under
// <direction-type>; dynamics/words/metronome/segno/coda/rehearsal are deferred.
export class Direction extends MElement {
  constructor() {
    super('direction');
  }

  get wedges(): Wedge[] {
    return this.markers(Wedge);
  }

  get pedals(): Pedal[] {
    return this.markers(Pedal);
  }

  get octaveShifts(): OctaveShift[] {
    return this.markers(OctaveShift);
  }

  // Onset within the measure, in beats — the cursor position where this
  // <direction> sits in the backup/forward fold.
  measureBeat(): number | null {
    const measure = this.closest(Measure);
    if (!measure) {
      return null;
    }
    const divisions = divisionsBackFrom(measure, measure.children.indexOf(this));
    const onset = onsetOf(measure, this);
    if (divisions == null || onset == null) {
      return null;
    }
    return onset / divisions;
  }

  private markers<T extends MElement>(type: new () => T): T[] {
    return this.childrenNamed('direction-type').flatMap((directionType) => directionType.childrenOfType(type));
  }
}
