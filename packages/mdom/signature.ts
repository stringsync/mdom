import { MElement, type MNode } from './m-node';
import type { Measure } from './measure';
import { measureIndexIn, measuresOf, Part } from './part';
import { memo } from './read-cache';

/**
 * `<attributes>` in effect, nearest first: scan backward from `fromIndex`
 * (exclusive) within `measure`, then through earlier measures of the part. This
 * one backward walk is the entire carry-forward — first match wins. A Note passes
 * its own index (so mid-measure changes count); a Measure passes the index of its
 * first note ("at the start of this measure": its own leading `<attributes>`
 * count, a mid-measure change does not). The same helper answers
 * clef/key/time/divisions/staves.
 */
export function attributesBackFrom(
	measure: Measure,
	fromIndex: number,
): MElement[] {
	const result: MElement[] = [];

	const children: readonly MNode[] = measure.children;
	for (let index = fromIndex - 1; index >= 0; index--) {
		const node = children[index];
		if (node instanceof MElement && node.tag === 'attributes') {
			result.push(node);
		}
	}

	const part = measure.closest(Part);
	if (part) {
		const measures = measuresOf(part);
		for (
			let earlier = measureIndexIn(part, measure) - 1;
			earlier >= 0;
			earlier--
		) {
			const attrs = measures[earlier]!.childrenNamed('attributes');
			for (let index = attrs.length - 1; index >= 0; index--) {
				result.push(attrs[index]!);
			}
		}
	}

	return result;
}

/**
 * The first `pick` match over {@link attributesBackFrom}`(measure, fromIndex)`,
 * without building that list. Earlier measures are answered from a per-part
 * carry table filled forward once per `key` and document change, so a walk that
 * asks at every measure stays linear. `key` must identify `pick` exactly (include
 * the staff a pick filters on): answers are shared by key. An array answer is
 * shared too, so callers copy it before returning it.
 */
export function attributeBackFrom<T>(
	measure: Measure,
	fromIndex: number,
	key: string,
	pick: (attrs: MElement) => T | null | undefined,
): T | null {
	const children: readonly MNode[] = measure.children;
	for (let index = fromIndex - 1; index >= 0; index--) {
		const node = children[index];
		if (node instanceof MElement && node.tag === 'attributes') {
			const found = pick(node);
			if (found != null) {
				return found;
			}
		}
	}
	const part = measure.closest(Part);
	return part
		? carriedInto(part, measureIndexIn(part, measure), key, pick)
		: null;
}

/**
 * The first `pick` match in the `<attributes>` of the measures before `index`,
 * nearest first. `before[i]` holds that answer for measure `i`; it is filled
 * forward lazily, so a query costs no more than the backward walk it replaces.
 */
function carriedInto<T>(
	part: Part,
	index: number,
	key: string,
	pick: (attrs: MElement) => T | null | undefined,
): T | null {
	if (index <= 0) {
		return null;
	}
	const before = memo(part, `carry:${key}`, (): Array<T | null> => [null]);
	const measures = measuresOf(part);
	while (before.length <= index) {
		const previous = before.length - 1;
		const attrs = measures[previous]!.childrenNamed('attributes');
		let found: T | null = null;
		for (let at = attrs.length - 1; at >= 0 && found == null; at--) {
			found = pick(attrs[at]!) ?? null;
		}
		before.push(found ?? before[previous] ?? null);
	}
	return before[index] ?? null;
}

/** `<divisions>` in effect (global) at `fromIndex` within `measure`. */
export function divisionsBackFrom(
	measure: Measure,
	fromIndex: number,
): number | null {
	return attributeBackFrom(measure, fromIndex, 'divisions', (attrs) => {
		const value = attrs.child('divisions')?.text;
		return value == null ? null : Number(value);
	});
}

/**
 * Whether a per-staff signature element (`<key>`/`<time>`/`<staff-details>`)
 * applies to `staff`: a `number` attribute targets one staff; its absence means
 * all staves. (Clefs are the exception — they match by exact staff, never
 * all-staves.)
 */
export function appliesToStaff(element: MElement, staff: string): boolean {
	const number = element.getAttribute('number');
	return number === null || number === staff;
}
