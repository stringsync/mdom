import type { MElement } from './m-node';
import { Score } from './score';

export class MDocument {
  constructor(
    readonly root: MElement,
    readonly declaration: Record<string, string> | null = null,
    readonly doctype: string | null = null
  ) {}

  static empty(): MDocument {
    return new MDocument(new Score());
  }

  get score(): Score | null {
    return this.root instanceof Score ? this.root : null;
  }
}
