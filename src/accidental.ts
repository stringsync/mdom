import { MElement, required } from './m-node';

/**
 * An `<accidental>`: the *printed* accidental glyph on a note (sharp, flat,
 * natural, ...), distinct from `<pitch><alter>`, which is the sounding pitch. A
 * renderer needs the glyph to size the note, and cautionary parentheses or
 * brackets widen it further — so those are surfaced too.
 */
export class Accidental extends MElement {
  constructor() {
    super('accidental');
  }

  /** The glyph name (sharp/flat/natural/...): required text on an `<accidental>`. */
  get value(): string {
    return required(this.text, 'value of <accidental>');
  }

  /** Whether this is a cautionary (reminder) accidental — `cautionary="yes"`. */
  get cautionary(): boolean {
    return this.getAttribute('cautionary') === 'yes';
  }

  /** Whether it's drawn in parentheses, which adds width. */
  get parentheses(): boolean {
    return this.getAttribute('parentheses') === 'yes';
  }

  /** Whether it's drawn in brackets, which adds width. */
  get bracket(): boolean {
    return this.getAttribute('bracket') === 'yes';
  }
}
