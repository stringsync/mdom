import type { MElement } from "./m-element";
import { MMutation } from "./m-mutation";

/** Base node in the document tree: either an {@link MText} or an {@link MElement}. */
export abstract class MNode {
	private _parent: MElement | null = null;

	/** The containing element, maintained by the structural mutation methods. */
	get parent(): MElement | null {
		return this._parent;
	}

	// vet-ignore noop-objects-over-null: a detached node has no parent: tree state, as in the DOM.
	// vet-ignore noop-objects-over-null: a detached node has no parent: tree state, as in the DOM.
	protected reparent(child: MNode, parent: MElement | null): void {
		MMutation.set(child, "parent", child._parent, parent, (value) => {
			child._parent = value;
		});
	}

	/** Detach this node from its parent, if any. */
	remove(): void {
		this.parent?.removeChild(this);
	}
}

/**
 * Assert a value the *caller* knows is present (a found child, a looked-up part).
 * Throws a located error instead of returning null, the hygienic replacement for
 * `x!`, which crashes later with no message. Use at call sites that have more
 * knowledge than the nullable primitive does.
 */
export function required<T>(value: T | null | undefined, what: string): T {
	if (value == null) {
		throw new Error(`mdom: missing required ${what}`);
	}
	return value;
}
