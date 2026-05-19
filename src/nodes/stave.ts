import type { StaveKey } from './keys';
import { Node } from './node';
import type { Part } from './part';
import type { Voice } from './voice';

// spec(mdom.hierarchy): a Stave is a staff line within a Part (e.g. piano has
// two) and has many Voices.
export class Stave extends Node<Part, StaveKey> {
  constructor(private readonly voices: Voice[]) {
    super();
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.voices.forEach((voice, index) => voice.attach(this, index));
  }

  getVoices(): Voice[] {
    return this.voices;
  }

  // spec(mdom.navigation): a Stave key extends its Part key (see mdom.keys).
  key(): StaveKey {
    return { ...this.parent().key(), staveIndex: this.index() };
  }
}
