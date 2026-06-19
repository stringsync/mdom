// Substrate for the MusicXML DOM: a faithful, generic tree of the document.
// Typed nodes (Score/Part/Measure) extend MElement; tags we don't model stay
// plain MElements, so anything we haven't typed still round-trips. The tree is
// mutated only through methods — `children` is a read-only view — and upward
// navigation is derived from a generic `parent` link, so no node type needs to
// know about a specific parent type.

type Ctor<T> = new (...args: never[]) => T;

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
  private kids: MNode[] = [];

  constructor(readonly tag: string) {
    super();
  }

  get children(): readonly MNode[] {
    return this.kids;
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
    this.kids.push(child);
  }

  removeChild(child: MNode): void {
    const i = this.kids.indexOf(child);
    if (i >= 0) {
      this.kids.splice(i, 1);
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
    return this.kids.filter((k): k is T => k instanceof type);
  }
}
