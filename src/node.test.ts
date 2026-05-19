import { describe, expect, test } from 'bun:test';

import { Document } from './document';
import { Node } from './node';

// A minimal concrete Node that exercises the abstract base class in isolation,
// independent of the real Measure/Part/Stave/Voice/Entry/Mod hierarchy. The
// key includes the sibling index so the protected index() is observable.
class TestNode<P> extends Node<P, { measureIndex: number }> {
  key(): { measureIndex: number } {
    return { measureIndex: this.index() };
  }
}

// spec(mdom.navigation): navigation is graph-first — every node carries
// back-references wired by attach(), so traversal is possible from any node.
describe('Node', () => {
  test('parent returns the node wired by attach', () => {
    const parent = new TestNode<Document>();
    const child = new TestNode<TestNode<Document>>();

    child.attach(parent, 0);

    expect(child.parent()).toBe(parent);
  });

  // spec(mdom.navigation): attach() sets the sibling index, observable via key().
  test('attach records the sibling index', () => {
    const parent = new TestNode<Document>();
    const child = new TestNode<TestNode<Document>>();

    child.attach(parent, 3);

    expect(child.key()).toEqual({ measureIndex: 3 });
  });

  test('sibling index defaults to 0 before attach', () => {
    const orphan = new TestNode<Document>();

    expect(orphan.key()).toEqual({ measureIndex: 0 });
  });

  // spec(mdom.navigation): attach() is the single wiring point, so re-attaching
  // re-parents and re-indexes a node.
  test('attach can re-wire parent and index', () => {
    const firstParent = new TestNode<Document>();
    const secondParent = new TestNode<Document>();
    const child = new TestNode<TestNode<Document>>();

    child.attach(firstParent, 1);
    child.attach(secondParent, 4);

    expect(child.parent()).toBe(secondParent);
    expect(child.key()).toEqual({ measureIndex: 4 });
  });

  // spec(mdom.navigation): the document root is reachable from anywhere.
  describe('document', () => {
    test('returns the Document for a node attached directly to it', () => {
      const document = new Document([]);
      const child = new TestNode<Document>();

      child.attach(document, 0);

      expect(child.document()).toBe(document);
    });

    test('walks up an arbitrarily deep chain to the same root', () => {
      const document = new Document([]);
      const a = new TestNode<Document>();
      const b = new TestNode<TestNode<Document>>();
      const c = new TestNode<TestNode<TestNode<Document>>>();

      a.attach(document, 0);
      b.attach(a, 0);
      c.attach(b, 0);

      expect(a.document()).toBe(document);
      expect(b.document()).toBe(document);
      expect(c.document()).toBe(document);
    });
  });
});
