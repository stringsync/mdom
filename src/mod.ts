import type { Entry } from './entry';
import type { ModKey } from './keys';
import { Node } from './node';

// spec(mdom.hierarchy): a Mod modifies an Entry; it is the deepest node in the
// hierarchy (see mdom.mods).
export class Mod extends Node<Entry, ModKey> {
  // spec(mdom.navigation): a Mod key extends its Entry key (see mdom.keys).
  key(): ModKey {
    return { ...this.parent().key(), modIndex: this.index() };
  }
}
