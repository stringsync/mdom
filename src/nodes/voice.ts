import type { Entry } from './entry';
import type { VoiceKey } from './keys';
import { Node } from './node';
import type { Stave } from './stave';

// spec(mdom.hierarchy): a Voice is an independent rhythmic stream within a
// Stave and has many Entries.
export class Voice extends Node<Stave, VoiceKey> {
  constructor(private readonly entries: Entry[]) {
    super();
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.entries.forEach((entry, index) => entry.attach(this, index));
  }

  getEntries(): Entry[] {
    return this.entries;
  }

  // spec(mdom.navigation): a Voice key extends its Stave key (see mdom.keys).
  key(): VoiceKey {
    return { ...this.parent().key(), voiceIndex: this.index() };
  }
}
