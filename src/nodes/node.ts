import type { Document } from './document';

// spec(mdom.navigation): navigation is graph-first — every node carries
// back-references, so traversal is bidirectional and possible from any node.
export abstract class Node<P, K> {
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
    let node: Node<unknown, unknown> | Document = this as Node<unknown, unknown>;
    while (node instanceof Node) {
      node = node.parent() as Node<unknown, unknown> | Document;
    }
    return node;
  }

  // spec(mdom.navigation): key() is this node's address (see mdom.keys).
  abstract key(): K;

  protected index(): number {
    return this.siblingIndex;
  }
}
