type Ctor<T> = new (...args: never[]) => T;

/**
 * Assert a value the *caller* knows is present (a found child, a looked-up part).
 * Throws a located error instead of returning null — the hygienic replacement for
 * `x!`, which crashes later with no message. Use at call sites that have more
 * knowledge than the nullable primitive does.
 */
export function required<T>(value: T | null | undefined, what: string): T {
  if (value == null) {
    throw new Error(`mdom: missing required ${what}`);
  }
  return value;
}

/** Base node in the document tree: either an {@link MText} or an {@link MElement}. */
export abstract class MNode {
  parent: MElement | null = null;

  /** Detach this node from its parent, if any. */
  remove(): void {
    this.parent?.removeChild(this);
  }
}

/** A text node — the leaf content held by value elements. */
export class MText extends MNode {
  constructor(public value: string) {
    super();
  }
}

/** An element: a tag with attributes, child nodes, and the tree-query axes. */
export class MElement extends MNode {
  private attrs: Record<string, string> = {};
  private _children: MNode[] = [];

  constructor(readonly tag: string) {
    super();
  }

  /** This element's child nodes. */
  get children(): readonly MNode[] {
    return this._children;
  }

  /** Leaf text content. First text node only — value elements hold exactly one. */
  get text(): string | null {
    for (const node of this._children) {
      if (node instanceof MText) {
        return node.value;
      }
    }
    return null;
  }

  /** A copy of this element's attributes. */
  get attributes(): Record<string, string> {
    return { ...this.attrs };
  }

  /** An attribute's value, or null when unset. */
  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  /** Set an attribute. */
  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
  }

  /**
   * The only way to add to the tree. Detaches the child from any old parent
   * first, so links stay consistent — there is no second way to mutate.
   */
  append(child: MNode): void {
    child.remove();
    child.parent = this;
    this._children.push(child);
  }

  /** Remove a direct child, clearing its parent link. */
  removeChild(child: MNode): void {
    const i = this._children.indexOf(child);
    if (i >= 0) {
      this._children.splice(i, 1);
      child.parent = null;
    }
  }

  /**
   * Nearest ancestor (or self) of the given type, or null. Upward axis of the
   * query engine — `closest(Part)` climbs the parent chain. Paired with
   * {@link childrenOfType} (the typed downward view), it resolves relationships
   * that aren't tree-shaped (slurs/ties/beams), which the typed nodes build on.
   */
  closest<T extends MElement>(type: Ctor<T>): T | null {
    if (this instanceof type) {
      return this;
    }
    let cur = this.parent;
    while (cur) {
      if (cur instanceof type) {
        return cur;
      }
      cur = cur.parent;
    }
    return null;
  }

  /** Direct children that are instances of `type`. */
  childrenOfType<T extends MElement>(type: Ctor<T>): T[] {
    return this._children.filter((k): k is T => k instanceof type);
  }

  /** First direct child element with this tag, or null. */
  child(tag: string): MElement | null {
    for (const node of this._children) {
      if (node instanceof MElement && node.tag === tag) {
        return node;
      }
    }
    return null;
  }

  /** All direct child elements with this tag. */
  childrenNamed(tag: string): MElement[] {
    return this._children.filter((k): k is MElement => k instanceof MElement && k.tag === tag);
  }
}
