import { MElement, required } from './m-node';

/** Indexed rather than computed: the gaps between E-F and B-C have no formula. */
const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * A `<staff-tuning>` inside `<staff-details>`: how one string of a tablature
 * staff is tuned. The presence of these is what identifies a staff as tablature.
 */
export class StaffTuning extends MElement {
  constructor() {
    super('staff-tuning');
  }

  /**
   * The `line` attribute: which staff line this string sits on, counted from the
   * BOTTOM (1 = bottom line). Note that MusicXML numbers tuning lines bottom-up
   * but strings top-down, so the two invert: `string = lineCount - line + 1`.
   */
  get line(): number {
    return Number(required(this.getAttribute('line'), 'line on <staff-tuning>'));
  }

  /** `<tuning-step>`: the open string's step name. */
  get step(): string {
    return required(this.child('tuning-step')?.text, '<tuning-step> in <staff-tuning>');
  }

  /** `<tuning-octave>`: the open string's octave. */
  get octave(): number {
    return Number(required(this.child('tuning-octave')?.text, '<tuning-octave> in <staff-tuning>'));
  }

  /** `<tuning-alter>` in semitones; 0 when absent (the common case). */
  get alter(): number {
    return Number(this.child('tuning-alter')?.text ?? 0);
  }

  /** MIDI number of the open string — what tunings and sounding pitches compare on. */
  get midi(): number {
    return (this.octave + 1) * 12 + (STEP_SEMITONES[this.step.toUpperCase()] ?? 0) + this.alter;
  }
}
