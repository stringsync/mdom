import type { Direction } from "./direction";
import type { Measure } from "./measure";

const DYNAMICS = ["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"];

/** One staff's direction in a measure, in the order Guitar Pro export reads it. */
interface StaffDirection {
	direction: Direction;
	/** Its place in the measure's document order. */
	order: number;
	/** Its onset for dynamics: the measure start when it has none. */
	beat: number;
	/** The last Guitar Pro dynamic it sets (upper case), or null. */
	dynamic: string | null;
	/** Its dynamic marks Guitar Pro cannot write. */
	unsupported: string[];
}

/** One staff of one measure: its directions sorted by onset, with what each prefix leaves in force. */
interface StaffMeasure {
	/** Sorted by `beat`, document order breaking ties. */
	byBeat: StaffDirection[];
	/** At each index of `byBeat`, the dynamic of the latest-in-document entry up to it that sets one. */
	latest: Array<StaffDirection | null>;
	/** The dynamic in force at the end of the measure, or null when it sets none. */
	last: string | null;
	/** How many of `byBeat` have had their unsupported marks reported. */
	reported: number;
	/** Its directions by exact onset, in document order; those without one are left out. */
	atOnset: Map<number, Direction[]>;
}

/**
 * The dynamics and same-onset directions each exported Guitar Pro beat
 * needs, indexed by measure and staff so sequential beats never rescan
 * earlier bars.
 */
export class GuitarProDirectionIndex {
	private readonly measures = new Map<Measure, Map<string, StaffMeasure>>();
	/** The dynamic in force at the end of each measure, by staff. */
	private readonly ends = new Map<Measure, Map<string, string>>();

	/**
	 * @param report Called once for each unsupported dynamic mark, when the
	 * first beat it reaches is written.
	 */
	constructor(private readonly report: (feature: string) => void) {}

	/** The dynamic in force at `onset` on `staff` of `measure`: forte before any mark. */
	dynamicAt(measure: Measure, staff: string, onset: number): string {
		const before =
			measure.index > 0
				? this.endOf(measure.part.measures[measure.index - 1]!, staff)
				: "F";
		const entry = this.staffMeasure(measure, staff);
		const reached = upperBound(entry.byBeat, onset);
		this.reportUpTo(entry, reached);
		return (reached > 0 ? entry.latest[reached - 1]?.dynamic : null) ?? before;
	}

	/** The directions on `staff` of `measure` whose onset is exactly `onset`, in document order. */
	directionsAt(measure: Measure, staff: string, onset: number): Direction[] {
		return this.staffMeasure(measure, staff).atOnset.get(onset) ?? [];
	}

	/** The dynamic in force after every direction on `staff` up to the end of `measure`. */
	private endOf(measure: Measure, staff: string): string {
		const measures = measure.part.measures;
		let start = measure.index;
		while (start >= 0 && !this.ends.get(measures[start]!)?.has(staff)) {
			start--;
		}
		let dynamic =
			start >= 0 ? this.ends.get(measures[start]!)!.get(staff)! : "F";
		for (let index = start + 1; index <= measure.index; index++) {
			const current = measures[index]!;
			const entry = this.staffMeasure(current, staff);
			this.reportUpTo(entry, entry.byBeat.length);
			dynamic = entry.last ?? dynamic;
			let ends = this.ends.get(current);
			if (!ends) {
				ends = new Map();
				this.ends.set(current, ends);
			}
			ends.set(staff, dynamic);
		}
		return dynamic;
	}

	private staffMeasure(measure: Measure, staff: string): StaffMeasure {
		let staves = this.measures.get(measure);
		if (!staves) {
			staves = this.index(measure);
			this.measures.set(measure, staves);
		}
		let entry = staves.get(staff);
		if (!entry) {
			entry = {
				byBeat: [],
				latest: [],
				last: null,
				reported: 0,
				atOnset: new Map(),
			};
			staves.set(staff, entry);
		}
		return entry;
	}

	private index(measure: Measure): Map<string, StaffMeasure> {
		const lists = new Map<string, StaffDirection[]>();
		for (const [order, direction] of measure.directions.entries()) {
			let dynamic: string | null = null;
			const unsupported: string[] = [];
			for (const mark of direction.dynamics.flatMap(
				(dynamics) => dynamics.marks,
			)) {
				if (DYNAMICS.includes(mark)) {
					dynamic = mark.toUpperCase();
				} else {
					unsupported.push(`dynamic ${mark}`);
				}
			}
			const list = lists.get(direction.staff) ?? [];
			list.push({
				direction,
				order,
				beat: direction.measureBeat ?? 0,
				dynamic,
				unsupported,
			});
			lists.set(direction.staff, list);
		}
		const staves = new Map<string, StaffMeasure>();
		for (const [staff, list] of lists) {
			const byBeat = list.toSorted(
				(staffDirection2, staffDirection) =>
					staffDirection2.beat - staffDirection.beat,
			);
			const latest: Array<StaffDirection | null> = [];
			let best: StaffDirection | null = null;
			for (const entry of byBeat) {
				if (entry.dynamic && (!best || entry.order > best.order)) {
					best = entry;
				}
				latest.push(best);
			}
			const last = list.findLast((entry) => entry.dynamic)?.dynamic ?? null;
			const atOnset = new Map<number, Direction[]>();
			for (const { direction } of list) {
				if (direction.measureBeat != null) {
					const same = atOnset.get(direction.measureBeat) ?? [];
					same.push(direction);
					atOnset.set(direction.measureBeat, same);
				}
			}
			staves.set(staff, { byBeat, latest, last, reported: 0, atOnset });
		}
		return staves;
	}

	/** Report the unsupported marks of the first `count` of `byBeat` not yet reported, in document order. */
	private reportUpTo(entry: StaffMeasure, count: number): void {
		if (count <= entry.reported) {
			return;
		}
		const fresh = entry.byBeat
			.slice(entry.reported, count)
			.toSorted(
				(staffDirection, staffDirection2) =>
					staffDirection.order - staffDirection2.order,
			);
		entry.reported = count;
		for (const direction of fresh) {
			for (const feature of direction.unsupported) {
				this.report(feature);
			}
		}
	}
}

/** How many of `sorted` have a beat at or before `onset`. */
function upperBound(sorted: StaffDirection[], onset: number): number {
	let low = 0;
	let high = sorted.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		if (sorted[middle]!.beat <= onset) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
}
