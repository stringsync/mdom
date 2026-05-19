import type { Document } from './document';
import type { MeasureKey } from './keys';
import { Node } from './node';
import type { Part } from './part';

// spec(mdom.hierarchy): a Measure is a timewise slice across all parts; its
// parent is the Document.
export class Measure extends Node<Document, MeasureKey> {
  constructor(private readonly parts: Part[]) {
    super();
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.parts.forEach((part, index) => part.attach(this, index));
  }

  getParts(): Part[] {
    return this.parts;
  }

  // spec(mdom.navigation): a Measure's address is just its index.
  key(): MeasureKey {
    return { measureIndex: this.index() };
  }
}
