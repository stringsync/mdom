import { MElement } from './m-node';
import { Measure } from './measure';
import { colorOf } from './print-style';
import { divisionsBackFrom } from './signature';
import { onsetOf } from './timeline';

/**
 * A `<barline>` in a measure: its bar style (final, double, dotted, ...) and any
 * repeat marker. MusicXML attaches it to the measure edge named by
 * {@link location}, and a measure can carry several (a left repeat and a right
 * repeat). A renderer reads it to draw the boundary and reserve its width.
 */
export class Barline extends MElement {
  constructor() {
    super('barline');
  }

  /** Which edge it sits on: 'right' (the MusicXML default), 'left', or 'middle'. */
  get location(): string {
    return this.getAttribute('location') ?? 'right';
  }

  /** `<bar-style>` (light-heavy, heavy-light, light-light, dotted, ...), or null for a plain barline. */
  get barStyle(): string | null {
    return this.child('bar-style')?.text ?? null;
  }

  /** `<repeat>` direction ('forward'/'backward') when this is a repeat barline, else null. */
  get repeat(): string | null {
    return this.child('repeat')?.getAttribute('direction') ?? null;
  }

  /**
   * The `<ending>` (volta) bracket, or null when there is none. `number` stays a
   * raw string — it is a list/range like `"1,2"` or `"1-3"` that the consumer parses.
   */
  get ending(): { type: 'start' | 'stop' | 'discontinue'; number: string } | null {
    const ending = this.child('ending');
    if (!ending) {
      return null;
    }
    return {
      type: ending.getAttribute('type') as 'start' | 'stop' | 'discontinue',
      number: ending.getAttribute('number') ?? '',
    };
  }

  /**
   * The `times` attribute of the `<repeat>` child (how many times to repeat),
   * parsed to a number; null when there is no `<repeat>` or no `times`. MusicXML's
   * implied default is 2 — left to the consumer, matching {@link repeat}.
   */
  get repeatTimes(): number | null {
    const times = this.child('repeat')?.getAttribute('times');
    return times == null ? null : Number(times);
  }

  /**
   * Onset within the measure, in beats — where this barline sits in the
   * backup/forward fold. Meaningful for `location="middle"`, a divider written
   * between two notes (a double bar or dotted divider mid-bar); the edges are 0
   * and the measure's end beat.
   */
  get measureBeat(): number | null {
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

  /** The normalized `color`; null when unset. */
  get color(): string | null {
    return colorOf(this);
  }
}
