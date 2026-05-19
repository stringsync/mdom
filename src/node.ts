import type { Document } from './document';
import type { Entry } from './entry';
import type { EntryKey, MeasureKey, ModKey, PartKey, StaveKey, VoiceKey } from './keys';
import type { Mod } from './mod';
import type { Part } from './part';
import type { Stave } from './stave';
import type { Voice } from './voice';

// spec(mdom.navigation): navigation is graph-first — every node carries
// back-references, so traversal is bidirectional and possible from any node.
export abstract class Node<P, K extends MeasureKey> {
  // Wired by the parent during construction; not part of the public surface.
  private parentNode!: P;
  private siblingIndex = 0;

  // spec(mdom.navigation): the parent wires the back-reference at construction
  // time; children exist before the parent, so this cannot be a constructor arg.
  attach(parent: P, index: number): void {
    this.parentNode = parent;
    this.siblingIndex = index;
  }

  // spec(mdom.navigation): parent() returns the immediate parent, walking up
  // the chain one step (e.g. Voice -> Stave -> Part -> Measure -> Document).
  parent(): P {
    return this.parentNode;
  }

  // spec(mdom.navigation): the document root is reachable from anywhere.
  document(): Document {
    let node: Node<unknown, MeasureKey> | Document = this as Node<unknown, MeasureKey>;
    while (node instanceof Node) {
      node = node.parent() as Node<unknown, MeasureKey> | Document;
    }
    return node;
  }

  // spec(mdom.keys): resolution goes through a single overloaded `at`, not a
  // matrix of per-level getters. Here `at` is relative — the key addresses a
  // descendant from this node down, so `Omit<…, keyof K>` strips the indices
  // this node already pins. Overloads are most-specific first so a deeper key
  // resolves to the deeper node rather than collapsing into a shallower one.
  // (Levels at or above K collapse to `{}` under a generic base; such calls
  // resolve to `undefined` harmlessly — the price of one `at` over a matrix.)
  at(rel: Omit<ModKey, keyof K>): Mod | undefined;
  at(rel: Omit<EntryKey, keyof K>): Entry | undefined;
  at(rel: Omit<VoiceKey, keyof K>): Voice | undefined;
  at(rel: Omit<StaveKey, keyof K>): Stave | undefined;
  at(rel: Omit<PartKey, keyof K>): Part | undefined;
  at(rel: object): Mod | Entry | Voice | Stave | Part | undefined {
    // spec(mdom.keys): a deeper key is a superset of its ancestors, so merging
    // this node's address with the relative remainder yields an absolute key
    // the root can resolve.
    return this.document().at({ ...this.key(), ...rel } as unknown as ModKey);
  }

  // spec(mdom.navigation): key() is this node's address (see mdom.keys).
  abstract key(): K;

  protected index(): number {
    return this.siblingIndex;
  }
}
