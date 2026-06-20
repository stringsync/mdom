import { MElement, required } from './m-node';

export class Pitch extends MElement {
  constructor() {
    super('pitch');
  }

  // <step> and <octave> are required in a well-formed <pitch>: a pitch without
  // them is a malformed document, not an expected state, so we throw rather than
  // hand back a null the caller has to defend against (and won't).
  get step(): string {
    return required(this.child('step')?.text, '<step> in <pitch>');
  }

  get octave(): number {
    return Number(required(this.child('octave')?.text, '<octave> in <pitch>'));
  }

  // <alter> is genuinely optional; the spec default for absence is natural (0).
  // Returning the default — not null — keeps the null reserved for things that
  // can actually be unknown.
  get alter(): number {
    return Number(this.child('alter')?.text ?? 0); // ± semitones; decimals for microtones
  }
}
