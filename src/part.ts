import type { PartKey } from './keys';
import type { Measure } from './measure';
import { Node } from './node';
import type { Stave } from './stave';

// spec(mdom.hierarchy): a Part lives within a Measure and has many Staves.
export class Part extends Node<Measure, PartKey> {
  constructor(private readonly staveNodes: Stave[]) {
    super();
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.staveNodes.forEach((stave, index) => stave.attach(this, index));
  }

  // spec(mdom.navigation): downward traversal — a Part's children are its
  // Staves (see mdom.hierarchy).
  staves(): Stave[] {
    return this.staveNodes;
  }

  // spec(mdom.navigation): a key extends its parent's, so a deeper key is a
  // superset of its ancestors (see mdom.keys).
  key(): PartKey {
    return { ...this.parent().key(), partIndex: this.index() };
  }
}
