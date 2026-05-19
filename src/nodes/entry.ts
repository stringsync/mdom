import type { EntryKey } from './keys';
import type { Mod } from './mod';
import { Node } from './node';
import type { Note } from './note';
import type { Voice } from './voice';

// spec(mdom.entries): an Entry's kind discriminates note / rest / chord. A
// chord is one Entry with multiple Notes; a rest is an Entry with no notes —
// MusicXML's per-note <chord/> flag is a serialization detail mdom hides.
export type EntryKind = 'note' | 'rest' | 'chord';

// spec(mdom.hierarchy): an Entry is the atomic timed unit within a Voice and
// has many Mods.
export class Entry extends Node<Voice, EntryKey> {
  // spec(mdom.entries): kind, notes (1 for a note, N for a chord, 0 for a
  // rest), and mods are the Entry's surface; resolved timing is derived
  // elsewhere (see mdom.timing).
  constructor(
    readonly kind: EntryKind,
    readonly notes: Note[],
    private readonly modNodes: Mod[] = []
  ) {
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
