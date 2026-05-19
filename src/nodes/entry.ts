import type { EntryKey } from './keys';
import type { Mod } from './mod';
import { Node } from './node';
import type { Voice } from './voice';

// spec(mdom.hierarchy): an Entry is the atomic timed unit within a Voice and
// has many Mods.
export class Entry extends Node<Voice, EntryKey> {
  constructor(private readonly modNodes: Mod[]) {
    super();
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.modNodes.forEach((mod, index) => mod.attach(this, index));
  }

  // spec(mdom.navigation): downward traversal — an Entry's children are its
  // Mods (see mdom.hierarchy).
  mods(): Mod[] {
    return this.modNodes;
  }

  // spec(mdom.navigation): an Entry key extends its Voice key (see mdom.keys).
  key(): EntryKey {
    return { ...this.parent().key(), entryIndex: this.index() };
  }
}
