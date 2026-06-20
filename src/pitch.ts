import { MElement, required } from './m-node';

/** A `<pitch>`: step, octave, and optional alteration. */
export class Pitch extends MElement {
  constructor() {
    super('pitch');
  }

  /**
   * `<step>`. Required in a well-formed `<pitch>`: absence is a malformed
   * document, not an expected state, so we throw rather than hand back a null the
   * caller has to defend against (and won't).
   */
  get step(): string {
    return required(this.child('step')?.text, '<step> in <pitch>');
  }

  /** `<octave>`. Required, like {@link step}. */
  get octave(): number {
    return Number(required(this.child('octave')?.text, '<octave> in <pitch>'));
  }

  /**
   * `<alter>` in ± semitones (decimals for microtones). Genuinely optional; the
   * spec default for absence is natural (0). Returning the default — not null —
   * keeps null reserved for things that can actually be unknown.
   */
  get alter(): number {
    return Number(this.child('alter')?.text ?? 0);
  }
}
