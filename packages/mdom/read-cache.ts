import { MMutation, type MStampScope } from "./m-mutation";
import type { MNode } from "./m-node";

interface Entry {
	stamp: number;
	value: unknown;
}

const entries = new WeakMap<object, Map<string, Entry>>();

/**
 * When any of `scopes` last changed for `node` (see {@link MMutation.stamp}).
 * Stamps share one clock, so the max over several nodes changes whenever any of
 * them does: an answer reading two nodes passes the max of their stamps.
 */
export function stampOf(node: MNode, ...scopes: MStampScope[]): number {
	let stamp = 0;
	for (const scope of scopes) {
		stamp = Math.max(stamp, MMutation.stamp(node, scope));
	}
	return stamp;
}

/**
 * `compute()`'s result for `owner` under `key`, reused while `stamp` is
 * unchanged: build it with {@link stampOf} from every node and scope the answer
 * reads, and edits elsewhere, in this document or another, keep it. Callers must
 * not hand a cached array or map out unprotected: freeze it or copy it at the
 * public boundary.
 */
export function memo<T>(
	owner: object,
	key: string,
	stamp: number,
	compute: () => T,
): T {
	let values = entries.get(owner);
	if (!values) {
		values = new Map();
		entries.set(owner, values);
	}
	const entry = values.get(key);
	if (entry && entry.stamp === stamp) {
		return entry.value as T;
	}
	const value = compute();
	values.set(key, { stamp, value });
	return value;
}
