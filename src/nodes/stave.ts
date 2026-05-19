import type { StaveKey } from './keys';
import { Node } from './node';
import type { Part } from './part';
import type { Voice } from './voice';

// spec(mdom.hierarchy): a Stave is a staff line within a Part (e.g. piano has
// two) and has many Voices.
export class Stave extends Node<Part, StaveKey> {
  constructor(private readonly voiceNodes: Voice[]) {
    super();
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.voiceNodes.forEach((voice, index) => voice.attach(this, index));
  }

  // spec(mdom.navigation): downward traversal — a Stave's children are its
  // Voices (see mdom.hierarchy).
  voices(): Voice[] {
    return this.voiceNodes;
  }

  // spec(mdom.navigation): a Stave key extends its Part key (see mdom.keys).
  key(): StaveKey {
    return { ...this.parent().key(), staveIndex: this.index() };
  }
}
