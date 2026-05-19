import type { EntryKey } from './keys';
import type { Mod } from './mod';
import { Node } from './node';
import type { Voice } from './voice';

// spec(mdom.hierarchy): an Entry is the atomic timed unit within a Voice and
// has many Mods.
export class Entry extends Node<Voice, EntryKey> {
  constructor(private readonly mods: Mod[]) {
    super();
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.mods.forEach((mod, index) => mod.attach(this, index));
  }

  getMods(): Mod[] {
    return this.mods;
  }

  // spec(mdom.navigation): an Entry key extends its Voice key (see mdom.keys).
  key(): EntryKey {
    return { ...this.parent().key(), entryIndex: this.index() };
  }
}
