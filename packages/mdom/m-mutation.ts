import type { MNode } from './m-node';

interface Change {
	before: unknown;
	after: unknown;
	apply(value: unknown): void;
}

/** Shared mutation boundary for document ownership and identity-preserving edits. */
export class MMutation {
	private static owners = new WeakMap<MNode, MNode>();
	private static managed = new WeakSet<MNode>();
	private static active: MMutation | null = null;
	private static notifying = false;
	private changes = new Map<MNode, Map<string, Change>>();
	private adopted = new Set<MNode>();

	constructor(private readonly root: MNode) {}

	static register(root: MNode, nodes: readonly MNode[]): void {
		if (root.parent || nodes.some((node) => MMutation.owners.has(node))) {
			throw new Error('mdom: document nodes already belong to a document');
		}
		for (const node of nodes) {
			MMutation.owners.set(node, root);
		}
	}

	static enable(root: MNode): void {
		if (MMutation.managed.has(root)) {
			throw new Error('mdom: document already has a history');
		}
		if (MMutation.owners.get(root) !== root) {
			throw new Error('mdom: history requires a document root');
		}
		MMutation.managed.add(root);
	}

	static assertIdle(): void {
		if (MMutation.active || MMutation.notifying) {
			throw new Error(
				'mdom: nested transactions and history operations are unsupported',
			);
		}
	}

	static notify(operation: () => void): void {
		MMutation.notifying = true;
		try {
			operation();
		} finally {
			MMutation.notifying = false;
		}
	}

	static assertWritable(node: MNode): void {
		if (MMutation.notifying) {
			throw new Error(
				'mdom: mutations during change notifications are unsupported',
			);
		}
		const owner = MMutation.owners.get(node);
		if (owner && MMutation.active && owner !== MMutation.active.root) {
			throw new Error('mdom: cannot edit another document in a transaction');
		}
		if (
			owner &&
			MMutation.managed.has(owner) &&
			MMutation.active?.root !== owner
		) {
			throw new Error('mdom: document mutations require history.edit');
		}
	}

	static adopt(parent: MNode, nodes: readonly MNode[]): void {
		MMutation.assertWritable(parent);
		const owner = MMutation.owners.get(parent);
		for (const node of nodes) {
			const previous = MMutation.owners.get(node);
			if (previous && (previous !== owner || node === previous)) {
				throw new Error(
					'mdom: moving nodes between documents or moving a document root is unsupported',
				);
			}
			MMutation.assertWritable(node);
		}
		if (owner) {
			for (const node of nodes) {
				if (!MMutation.owners.has(node)) {
					MMutation.active?.adopted.add(node);
					MMutation.owners.set(node, owner);
				}
			}
		}
	}

	// rule-ignore objects-over-callbacks: the replay writer closes over private node storage.
	static set<T>(
		node: MNode,
		field: string,
		before: T,
		after: T,
		apply: (value: T) => void,
	): void {
		MMutation.assertWritable(node);
		if (equal(before, after)) {
			return;
		}
		const active = MMutation.active;
		if (active) {
			let fields = active.changes.get(node);
			if (!fields) {
				fields = new Map();
				active.changes.set(node, fields);
			}
			const change = fields.get(field);
			if (change) {
				change.after = after;
			} else {
				fields.set(field, {
					before,
					after,
					apply: (value) => apply(value as T),
				});
			}
		}
		apply(after);
	}

	run<T>(operation: () => T): T {
		MMutation.assertIdle();
		MMutation.active = this;
		try {
			const result = operation();
			if (
				result != null &&
				(typeof result === 'object' || typeof result === 'function') &&
				'then' in result &&
				typeof result.then === 'function'
			) {
				// A returned promise cannot extend the synchronous mutation window.
				if (result instanceof Promise) {
					void result.catch(() => {});
				}
				throw new Error('mdom: transaction callbacks must be synchronous');
			}
			return result;
		} catch (error) {
			this.restore('before');
			throw error;
		} finally {
			MMutation.active = null;
		}
	}

	commit(): boolean {
		// Unattached builders are not part of this document and can still be edited
		// freely. Keeping their records would let undo overwrite unrelated work.
		for (const node of this.changes.keys()) {
			if (MMutation.owners.get(node) !== this.root) {
				this.changes.delete(node);
			}
		}
		for (const [node, fields] of this.changes) {
			let top = node;
			while (top.parent) {
				top = top.parent;
			}
			const retained =
				MMutation.owners.get(node) === this.root && !this.adopted.has(node);
			if (
				(retained || top === this.root) &&
				[...fields.values()].some(
					(change) => !equal(change.before, change.after),
				)
			) {
				return true;
			}
		}
		return false;
	}

	restore(side: 'before' | 'after'): void {
		for (const fields of this.changes.values()) {
			for (const change of fields.values()) {
				change.apply(change[side]);
			}
		}
	}
}

function equal(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) {
		return true;
	}
	if (Array.isArray(left) && Array.isArray(right)) {
		return (
			left.length === right.length &&
			left.every((value, index) => value === right[index])
		);
	}
	return false;
}
