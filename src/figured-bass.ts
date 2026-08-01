import { MElement } from './m-node';
import { type Note, adjacentNote } from './note';
import { placementOf } from './print-style';

/**
 * One `<figure>` of a figured-bass stack: a numeral with an optional accidental
 * before or after it (`#6`, `4+`), or an accidental on its own.
 */
export class Figure extends MElement {
  constructor() {
    super('figure');
  }

  /** `<prefix>`: the accidental printed before the numeral (sharp/flat/natural/slash/…); null when none. */
  get prefix(): string | null {
    return this.child('prefix')?.text ?? null;
  }

  /** `<figure-number>`: the numeral itself, kept as a string; null when the figure is an accidental alone. */
  get number(): string | null {
    return this.child('figure-number')?.text ?? null;
  }

  /** `<suffix>`: the accidental or stroke printed after the numeral; null when none. */
  get suffix(): string | null {
    return this.child('suffix')?.text ?? null;
  }

  /** Whether an `<extend>` line trails this figure (it holds through the next bass notes). */
  get extend(): boolean {
    return this.child('extend') !== null;
  }
}

/**
 * A `<figured-bass>`: the continuo numerals stacked under a bass note. It sits
 * between notes in the measure like a `<harmony>` does, and binds to the note it
 * decorates the same way — see {@link nextNote}.
 */
export class FiguredBass extends MElement {
  constructor() {
    super('figured-bass');
  }

  /** The stack, top figure first (document order). */
  get figures(): Figure[] {
    return this.childrenOfType(Figure);
  }

  /** The `parentheses="yes"` attribute — the whole stack is printed in brackets. */
  get parentheses(): boolean {
    return this.getAttribute('parentheses') === 'yes';
  }

  /** `placement`; null when unstated. */
  get placement(): 'above' | 'below' | null {
    return placementOf(this);
  }

  /**
   * The note this stack sits under — the nearest non-`<chord/>` note after it,
   * the same binding {@link Harmony.nextNote} uses.
   */
  get nextNote(): Note | null {
    return adjacentNote(this, 1);
  }
}
