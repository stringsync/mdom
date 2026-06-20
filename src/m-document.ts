import type { MElement } from './m-node';
import { Score } from './score';

/** A parsed document: the root element plus the XML declaration and doctype. */
export class MDocument {
  constructor(
    readonly root: MElement,
    readonly declaration: Record<string, string> | null = null,
    readonly doctype: string | null = null
  ) {}

  /** A document with an empty {@link Score} root. */
  static empty(): MDocument {
    return new MDocument(new Score());
  }

  /** The root as a {@link Score}, or null when the root is something else. */
  get score(): Score | null {
    return this.root instanceof Score ? this.root : null;
  }
}
