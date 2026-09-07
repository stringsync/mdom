import { MMutation } from './m-mutation';

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
	private _parent: MElement | null = null;

	/** The containing element, maintained by the structural mutation methods. */
	get parent(): MElement | null {
		return this._parent;
	}

	protected reparent(child: MNode, parent: MElement | null): void {
		MMutation.set(child, 'parent', child._parent, parent, (value) => {
			child._parent = value;
		});
	}

	/** Detach this node from its parent, if any. */
	remove(): void {
		this.parent?.removeChild(this);
	}
}

/** A text node — the leaf content held by value elements. */
export class MText extends MNode {
	constructor(private _value: string) {
		super();
	}

	get value(): string {
		return this._value;
	}
	set value(value: string) {
		MMutation.set(this, 'value', this._value, value, (next) => {
			this._value = next;
		});
	}
}

/**
 * A `<![CDATA[…]]>` section, preserved verbatim so documents round-trip. Kept
 * distinct from {@link MText} because the content is emitted unescaped — it
 * doesn't feed the `text` accessor, which reads ordinary value elements.
 */
export class MCData extends MNode {
	constructor(private _value: string) {
		super();
	}

	get value(): string {
		return this._value;
	}
	set value(value: string) {
		MMutation.set(this, 'value', this._value, value, (next) => {
			this._value = next;
		});
	}
}

/** An element: a tag with attributes, child nodes, and the tree-query axes. */
export class MElement extends MNode {
	private attrs: Record<string, string> = {};
	private _children: readonly MNode[] = Object.freeze([]);

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

	/**
	 * Set leaf text content, reusing the existing text node so its position is
	 * kept (value elements hold exactly one); appends one when there is none. The
	 * in-place counterpart to {@link text} — how an edit rewrites a `<duration>`.
	 */
	setText(value: string): void {
		for (const node of this._children) {
			if (node instanceof MText) {
				node.value = value;
				return;
			}
		}
		this.append(new MText(value));
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
		const entries = Object.entries(this.attrs);
		const index = entries.findIndex(([key]) => key === name);
		if (index < 0) {
			entries.push([name, value]);
		} else {
			entries[index] = [name, value];
		}
		this.setAttributes(entries);
	}

	/** Remove an attribute, if present. */
	removeAttribute(name: string): void {
		this.setAttributes(
			Object.entries(this.attrs).filter(([key]) => key !== name),
		);
	}

	private setAttributes(entries: [string, string][]): void {
		// Flat pairs compare by value, including order, without serializing XML.
		MMutation.set(
			this,
			'attributes',
			Object.entries(this.attrs).flat(),
			entries.flat(),
			(value) => {
				const attrs: [string, string][] = [];
				for (let i = 0; i < value.length; i += 2) {
					attrs.push([
						required(value[i], 'attribute name'),
						required(value[i + 1], 'attribute value'),
					]);
				}
				this.attrs = Object.fromEntries(attrs);
			},
		);
	}

	/** Append a child, detaching it from its previous parent. */
	append(child: MNode): void {
		this.insertBefore(child, null);
	}

	/** Remove a direct child, clearing its parent link. */
	removeChild(child: MNode): void {
		MMutation.assertWritable(this);
		if (this._children.includes(child)) {
			this.setChildren(this._children.filter((node) => node !== child));
			this.reparent(child, null);
		}
	}

	/** Insert a child before a reference, or append when the reference is null. */
	insertBefore(child: MNode, ref: MNode | null): void {
		if (ref !== null && !this._children.includes(ref)) {
			throw new Error('mdom: insertBefore reference is not a child');
		}
		this.prepareChild(child);
		if (child === ref) {
			return;
		}
		child.remove();
		const children = [...this._children];
		children.splice(
			ref === null ? children.length : children.indexOf(ref),
			0,
			child,
		);
		this.setChildren(children);
		this.reparent(child, this);
	}

	/** Replace a direct child, preserving the position among remaining siblings. */
	replaceChild(child: MNode, replacement: MNode): void {
		if (!this._children.includes(child)) {
			throw new Error('mdom: replaceChild target is not a child');
		}
		this.prepareChild(replacement);
		if (child === replacement) {
			return;
		}
		replacement.remove();
		const children = [...this._children];
		children[children.indexOf(child)] = replacement;
		this.setChildren(children);
		this.reparent(child, null);
		this.reparent(replacement, this);
	}

	private setChildren(children: readonly MNode[]): void {
		MMutation.set(
			this,
			'children',
			this._children,
			Object.freeze(children),
			(value) => {
				this._children = value;
			},
		);
	}

	private prepareChild(child: MNode): void {
		let ancestor: MNode | null = this;
		while (ancestor) {
			if (ancestor === child) {
				throw new Error('mdom: a node cannot contain itself');
			}
			ancestor = ancestor.parent;
		}
		MMutation.adopt(this, descendants(child));
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
		return this._children.filter(
			(k): k is MElement => k instanceof MElement && k.tag === tag,
		);
	}
}

/** Enumerate a subtree, including its root, for document ownership checks. */
export function descendants(node: MNode): MNode[] {
	const nodes = [node];
	for (let i = 0; i < nodes.length; i++) {
		const current = nodes[i];
		if (current instanceof MElement) {
			nodes.push(...current.children);
		}
	}
	return nodes;
}
