import { expect } from "bun:test";
import { MDOMParser, type MDocument, type Note } from "@stringsync/mdom";
import {
	heapUsed,
	measureOperation,
	type Operation,
} from "./scaling-operations";

export const parser = new MDOMParser();
export const seed = parser.parseFromString(
	'<score-partwise><part-list/><part id="P1"><measure><note><pitch><step>C</step><octave>4</octave></pitch></note></measure></part></score-partwise>',
);

const roots = new Set<{ document: MDocument; notes: Note[] }>();
export function historyRetention(xml: string, entries: number) {
	const document = parser.parseFromString(xml);
	const notes = document.score.parts.flatMap((part) =>
		part.measures.flatMap((measure) => measure.notes),
	);
	const root = { document, notes };
	roots.add(root);
	const history = document.history;
	try {
		for (let index = 0; index < entries; index++) {
			const note = notes[index % notes.length]!;
			history.edit("pitch", () =>
				note.setPitch({
					step: note.pitch?.step === "C" ? "D" : "C",
					octave: 5,
				}),
			);
		}
		let undone = 0;
		while (history.undo()) {
			undone++;
		}
		let redone = 0;
		while (history.redo()) {
			redone++;
		}
		expect(undone).toBe(entries);
		expect(redone).toBe(entries);
		const retainedControlBytes = heapUsed();
		const retainedBytes = heapUsed();
		history.dispose();
		const releasedBytes = heapUsed();
		const releasedControlBytes = heapUsed();
		expect(roots.has(root)).toBe(true);
		expect(root.document.score.parts[0]!.measures).toHaveLength(
			notes.length / 4,
		);
		return {
			entries,
			retainedControlBytes,
			releasedControlBytes,
			retainedBytes,
			releasedBytes,
			retained: retainedBytes - releasedBytes,
		};
	} finally {
		history.dispose();
		roots.delete(root);
	}
}

// Under host load a single timing can swing 2-10x, so a round that misses the
// bound is retried with more samples; the minimum over all rounds only falls.
// A real superlinear regression stays over the bound in every round.
const guardRounds = 5;

/**
 * Best-of-N timings of `operation` on two inputs, after warming both, with
 * fresh documents per run so cached reads cannot make it a warm-cache guard.
 * Rounds of three runs repeat until the ratio is under 6 or rounds run out.
 */
export async function guardRatio(
	operation: Operation,
	scores: readonly string[],
	units: readonly number[],
	evidenceOf: Record<string, unknown>,
): Promise<void> {
	for (const xml of scores) {
		await measureOperation(operation, xml, 0);
	}
	const samples: number[][] = [[], []];
	let small = 0;
	let large = 0;
	for (let round = 0; round < guardRounds; round++) {
		for (let run = 0; run < 3; run++) {
			// Alternate order to avoid consistently favoring one size.
			for (const index of run % 2 ? [1, 0] : [0, 1]) {
				const sample = await measureOperation(operation, scores[index]!, 0);
				expect(sample.workUnits).toBe(units[index]!);
				expect(sample.checksum).toBeGreaterThan(0);
				samples[index]!.push(sample.elapsedMs);
			}
		}
		small = Math.min(...samples[0]!);
		large = Math.min(...samples[1]!);
		if (small > 0 && large / small < 6) {
			return;
		}
	}
	const evidence = JSON.stringify({
		operation,
		...evidenceOf,
		samples,
		small,
		large,
	});
	expect(small, evidence).toBeGreaterThan(0);
	expect(large / small, evidence).toBeLessThan(6);
}
