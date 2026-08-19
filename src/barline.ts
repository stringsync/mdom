import { MElement } from './m-node';
import { appendValue, Measure } from './measure';
import { colorOf } from './print-style';
import { divisionsBackFrom } from './signature';
import { onsetOf } from './timeline';

/** A `<barline>` to write: the bar style, and any repeat or volta on it. */
export interface BarlineSpec {
  /** Which edge; 'right' (the MusicXML default) when omitted. */
  location?: 'left' | 'right' | 'middle';
  /** `<bar-style>` (light-heavy, heavy-light, light-light, dotted, ...). */
  barStyle?: string;
  repeat?: { direction: 'forward' | 'backward'; times?: number };
  /**
   * The volta bracket. `number` is MusicXML's raw list/range spelling (`'1'`,
   * `'1,2'`); `text` is what is printed above it, defaulting to `number`.
   */
  ending?: { type: 'start' | 'stop' | 'discontinue'; number: string; text?: string };
}

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

/** Build a detached `<barline>` from a spec, children in schema order. */
export function buildBarline(spec: BarlineSpec): Barline {
  const barline = new Barline();
  if (spec.location != null) {
    barline.setAttribute('location', spec.location);
  }
  if (spec.barStyle != null) {
    appendValue(barline, 'bar-style', spec.barStyle);
  }
  if (spec.ending) {
    // <ending> prints its own text content; MusicXML repeats the number there,
    // so defaulting to it is what a caller passing just `number` means.
    const ending = appendValue(barline, 'ending', spec.ending.text ?? spec.ending.number);
    ending.setAttribute('number', spec.ending.number);
    ending.setAttribute('type', spec.ending.type);
  }
  if (spec.repeat) {
    const repeat = new MElement('repeat');
    repeat.setAttribute('direction', spec.repeat.direction);
    if (spec.repeat.times != null) {
      repeat.setAttribute('times', String(spec.repeat.times));
    }
    barline.append(repeat);
  }
  return barline;
}
