type Ctor<T> = new (...args: never[]) => T;

// Assert a value the *caller* knows is present (a found child, a looked-up part).
// Throws a located error instead of returning null — the hygienic replacement for
// `x!`, which crashes later with no message. Use at call sites that have more
// knowledge than the nullable primitive does.
export function required<T>(value: T | null | undefined, what: string): T {
  if (value == null) {
    throw new Error(`mdom: missing required ${what}`);
  }
  return value;
}

export abstract class MNode {
  parent: MElement | null = null;

  remove(): void {
    this.parent?.removeChild(this);
  }
}

export class MText extends MNode {
  constructor(public value: string) {
    super();
  }
}

export class MElement extends MNode {
  private attrs: Record<string, string> = {};
  private _children: MNode[] = [];

  constructor(readonly tag: string) {
    super();
  }

  get children(): readonly MNode[] {
    return this._children;
  }

  // Leaf text content. First text node only — value elements hold exactly one.
  get text(): string | null {
    for (const node of this._children) {
      if (node instanceof MText) {
        return node.value;
      }
    }
    return null;
  }

  get attributes(): Record<string, string> {
    return { ...this.attrs };
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
  }

  // The only way to add to the tree. Detaches the child from any old parent
  // first, so links stay consistent — there is no second way to mutate.
  append(child: MNode): void {
    child.remove();
    child.parent = this;
    this._children.push(child);
  }

  removeChild(child: MNode): void {
    const i = this._children.indexOf(child);
    if (i >= 0) {
      this._children.splice(i, 1);
      child.parent = null;
    }
  }

  // Upward + filtered queries: the generic axes that make this a query engine.
  // `closest(Part)` climbs the parent chain; `childrenOfType(Measure)` is the
  // typed downward view. Relationships that aren't tree-shaped (slurs/ties/beams,
  // paired start/stop markers joined by a `number` attribute) get resolved by
  // query methods on the typed node, built from these primitives.
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

  childrenOfType<T extends MElement>(type: Ctor<T>): T[] {
    return this._children.filter((k): k is T => k instanceof type);
  }

  child(tag: string): MElement | null {
    for (const node of this._children) {
      if (node instanceof MElement && node.tag === tag) {
        return node;
      }
    }
    return null;
  }

  childrenNamed(tag: string): MElement[] {
    return this._children.filter((k): k is MElement => k instanceof MElement && k.tag === tag);
  }
}
