import { MMutation } from './m-mutation';

interface Entry {
	epoch: number;
	values: Map<string, unknown>;
}

const entries = new WeakMap<object, Entry>();

/**
 * `compute()`'s result for `owner` under `key`, reused until the next document
 * change anywhere (see {@link MMutation.epoch}). Callers must not hand a cached
 * array or map out unprotected: freeze it or copy it at the public boundary.
 */
export function memo<T>(owner: object, key: string, compute: () => T): T {
	let entry = entries.get(owner);
	if (!entry || entry.epoch !== MMutation.epoch) {
		entry = { epoch: MMutation.epoch, values: new Map() };
		entries.set(owner, entry);
	}
	if (entry.values.has(key)) {
		return entry.values.get(key) as T;
	}
	const value = compute();
	entry.values.set(key, value);
	return value;
}
