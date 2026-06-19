import type { MElement } from './m-node';
import { Score } from './score';

// A document: the XML envelope (declaration + doctype) we preserve for
// round-trip fidelity, plus the root element (a Score, for score-partwise).
// Parse one with MDOMParser, or start a blank one with MDocument.empty().
export class MDocument {
  constructor(
    readonly root: MElement,
    readonly declaration: Record<string, string> | null = null,
    readonly doctype: string | null = null
  ) {}

  // Start a document from scratch — an empty score-partwise, no MusicXML needed.
  static empty(): MDocument {
    return new MDocument(new Score());
  }

  get score(): Score | null {
    return this.root instanceof Score ? this.root : null;
  }
}
