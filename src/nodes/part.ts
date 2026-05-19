import type { PartKey } from './keys';
import type { Measure } from './measure';
import { Node } from './node';
import type { Stave } from './stave';

// spec(mdom.hierarchy): a Part lives within a Measure and has many Staves.
export class Part extends Node<Measure, PartKey> {
  constructor(private readonly staves: Stave[]) {
    super();
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.staves.forEach((stave, index) => stave.attach(this, index));
  }

  getStaves(): Stave[] {
    return this.staves;
  }

  // spec(mdom.navigation): a key extends its parent's, so a deeper key is a
  // superset of its ancestors (see mdom.keys).
  key(): PartKey {
    return { ...this.parent().key(), partIndex: this.index() };
  }
}
