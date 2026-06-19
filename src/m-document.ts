import type { MElement } from './m-node';
import { Score } from './score';

// A parsed document: the XML envelope (declaration + doctype) we preserve for
// round-trip fidelity, plus the root element (a Score, for score-partwise).
export class MDocument {
  constructor(
    readonly root: MElement,
    readonly declaration: Record<string, string> | null = null,
    readonly doctype: string | null = null
  ) {}

  get score(): Score | null {
    return this.root instanceof Score ? this.root : null;
  }
}
