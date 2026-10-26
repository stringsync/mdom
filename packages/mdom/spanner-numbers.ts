import type { MElement } from './m-node';
import type { Note } from './note';
import { Part } from './part';
import { stampOf } from './read-cache';

type Markers = (note: Note) => (MElement & { number: string })[];

/** A span of one number as note positions; unpaired ends run to ±Infinity. */
interface Interval {
	start: number;
	end: number;
}

/** One number's start/stop markers, as the pairing scan reads them. */
interface NumberIndex {
	/** Paired and trailing-open intervals; ends are nondecreasing. */
	intervals: Interval[];
	/** The last position of a stop with no start before it, or -Infinity. */
	strayEnd: number;
	/** Every start/stop marker's note position, sorted. */
	positions: number[];
}

interface KindIndex {
	numbers: Map<string, NumberIndex>;
}

/**
 * A part's note positions and, per marker kind, its numbers' spans. Valid while
 * the part's subtree stamp is unchanged; an allocation's own writes re-stamp it
 * instead of discarding it, so building k spans scans the part once, not k times.
 */
interface PartIndex {
	stamp: number;
	positions: Map<Note, number>;
	kinds: Map<object, KindIndex>;
}

const parts = new WeakMap<Part, PartIndex>();

/**
 * Give a new span from `first` to `last` the lowest number whose existing spans
 * of this `kind` in the part all end before `first` or start after `last`, so
 * numbers are reused across sequential spans and stay within MusicXML's 1-16. A
 * start without a stop stays open to the end of the part, a stop without a start
 * open from its beginning. `write` adds the markers (and anything else on those
 * notes that moves no note and no other marker of the kind); the part's index
 * then takes the new span in place.
 */
export function allocateSpanNumber<T>(
	first: Note,
	last: Note,
	kind: object,
	existing: Markers,
	write: (number: string) => T,
): T {
	const part = first.closest(Part);
	if (!part) {
		return write('1');
	}
	const index = partIndex(part);
	const kindIndex = kindIndexOf(index, part, kind, existing);
	const from = index.positions.get(first) ?? -1;
	const to = index.positions.get(last) ?? -1;
	let candidate = 1;
	while (blocks(kindIndex.numbers.get(String(candidate)), from, to)) {
		candidate++;
	}
	const number = String(candidate);
	const result = write(number);
	const stamp = stampOf(part, 'subtree');
	if (stamp !== index.stamp) {
		index.stamp = stamp;
		if (!(0 <= from && from <= to && insert(kindIndex, number, from, to))) {
			index.kinds.delete(kind);
		}
	}
	return result;
}

function partIndex(part: Part): PartIndex {
	const stamp = stampOf(part, 'subtree');
	let index = parts.get(part);
	if (!index || index.stamp !== stamp) {
		const positions = new Map<Note, number>();
		for (const measure of part.measures) {
			for (const note of measure.notes) {
				positions.set(note, positions.size);
			}
		}
		index = { stamp, positions, kinds: new Map() };
		parts.set(part, index);
	}
	return index;
}

/** Pair each number's markers in document order, as a stray-tolerant reader would. */
function kindIndexOf(
	index: PartIndex,
	part: Part,
	kind: object,
	existing: Markers,
): KindIndex {
	const cached = index.kinds.get(kind);
	if (cached) {
		return cached;
	}
	const numbers = new Map<string, NumberIndex>();
	const open = new Map<string, number>();
	for (const measure of part.measures) {
		for (const note of measure.notes) {
			const position = index.positions.get(note)!;
			for (const marker of existing(note)) {
				const type = marker.getAttribute('type');
				if (type !== 'start' && type !== 'stop') {
					continue;
				}
				const number = marker.number;
				let entry = numbers.get(number);
				if (!entry) {
					entry = { intervals: [], strayEnd: -Infinity, positions: [] };
					numbers.set(number, entry);
				}
				entry.positions.push(position);
				if (type === 'start') {
					open.set(number, position);
					continue;
				}
				const start = open.get(number);
				open.delete(number);
				if (start === undefined) {
					entry.strayEnd = position;
				} else {
					entry.intervals.push({ start, end: position });
				}
			}
		}
	}
	for (const [number, start] of open) {
		numbers.get(number)!.intervals.push({ start, end: Infinity });
	}
	const kindIndex = { numbers };
	index.kinds.set(kind, kindIndex);
	return kindIndex;
}

/** Whether a span of this number meets the positions `from`..`to`. */
function blocks(
	entry: NumberIndex | undefined,
	from: number,
	to: number,
): boolean {
	if (!entry) {
		return false;
	}
	if (entry.strayEnd >= from) {
		return true;
	}
	// Ends only grow, and each paired start follows the stop before it, so the
	// first span ending at or after `from` starts no later than any after it.
	const next = entry.intervals[firstAtLeast(entry.intervals, from, endOf)];
	return next !== undefined && next.start <= to;
}

/**
 * Record a new span `from`..`to` under `number`. Exact when no marker of the
 * number sits on those notes, so the new start and stop pair with each other and
 * leave every other pairing as it was; otherwise the caller rescans.
 */
function insert(
	kindIndex: KindIndex,
	number: string,
	from: number,
	to: number,
): boolean {
	let entry = kindIndex.numbers.get(number);
	if (!entry) {
		entry = { intervals: [], strayEnd: -Infinity, positions: [] };
		kindIndex.numbers.set(number, entry);
	}
	const at = firstAtLeast(entry.positions, from, (position) => position);
	if ((entry.positions[at] ?? Infinity) <= to) {
		return false;
	}
	entry.positions.splice(at, 0, from, to);
	entry.intervals.splice(firstAtLeast(entry.intervals, to, endOf), 0, {
		start: from,
		end: to,
	});
	return true;
}

function endOf(interval: Interval): number {
	return interval.end;
}

/** The first index whose `key` is at least `value` in an array sorted by it. */
function firstAtLeast<T>(
	items: readonly T[],
	value: number,
	key: (item: T) => number,
): number {
	let low = 0;
	let high = items.length;
	while (low < high) {
		const middle = (low + high) >>> 1;
		if (key(items[middle]!) < value) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
}
