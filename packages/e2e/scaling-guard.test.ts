import { describe, expect, it } from "bun:test";
import { guardRatio, historyRetention, seed } from "./scaling-guard-support";
import type { Operation } from "./scaling-operations";
import { syntheticScore } from "./scaling-score";

// Evidence and axis limitations: notes/performance-audit.md (#42).
// Only measures grow: one part, one voice, four notes per measure.
describe("bounded-density measure scaling guards (64 → 256)", () => {
	const sizes = [64, 256] as const;
	const inputs = sizes.map((measures) =>
		syntheticScore(seed, { measures, parts: 1, voices: 1, notes: 4 }),
	);
	const guardLinear = (operation: Operation) =>
		guardRatio(
			operation,
			inputs,
			sizes.map((measures) =>
				operation === "span-add" ? (measures * 4 - 1) * 3 : measures * 4,
			),
			{ sizes },
		);

	const guardRetention = (fixedEntries: boolean) => {
		// Warm allocation/GC paths before comparing paired retained/released
		// boundaries. Keep raw bytes in failures; never divide signed noise.
		historyRetention(inputs[0]!, 256);
		const samples = inputs.map((xml, index) =>
			Array.from({ length: 3 }, () =>
				historyRetention(xml, fixedEntries ? 256 : sizes[index]! * 4),
			),
		);
		const evidence = JSON.stringify({ sizes, fixedEntries, samples });
		for (const sample of samples.flat()) {
			expect(sample.retained, evidence).toBeGreaterThan(0);
			// No-op collections at each boundary must be small relative to the
			// released history. Setup-to-edit deltas are deliberately unused:
			// the audit found unrelated temporary roots make them unstable.
			const noise = Math.max(
				Math.abs(sample.retainedControlBytes - sample.retainedBytes),
				Math.abs(sample.releasedControlBytes - sample.releasedBytes),
			);
			expect(noise / sample.retained, evidence).toBeLessThan(0.1);
		}
		const small = Math.min(...samples[0]!.map((sample) => sample.retained));
		const large = Math.min(...samples[1]!.map((sample) => sample.retained));
		expect(large / small, evidence).toBeLessThan(fixedEntries ? 2 : 6);
	};

	it("parse time grows less than 6x for 4x measures", () =>
		guardLinear("parse"));

	it("gpif-parse time grows less than 6x for 4x measures", () =>
		guardLinear("gpif-parse"));

	it("mxl-unzip time grows less than 6x for 4x measures", () =>
		guardLinear("mxl-unzip"));

	it("serialize-xml time grows less than 6x for 4x measures", () =>
		guardLinear("serialize-xml"));

	it("serialize-mxl time grows less than 6x for 4x measures", () =>
		guardLinear("serialize-mxl"));

	it("read-walk time grows less than 6x for 4x measures", () =>
		guardLinear("read-walk"));

	it("cursor time grows less than 6x for 4x measures", () =>
		guardLinear("cursor"));

	it("history time grows less than 6x for 4x measures", () =>
		guardLinear("history"));

	it("edit-insert-read time grows less than 6x for 4x measures", () =>
		guardLinear("edit-insert-read"));

	it("edit-remove-read time grows less than 6x for 4x measures", () =>
		guardLinear("edit-remove-read"));

	it("edit-set-read time grows less than 6x for 4x measures", () =>
		guardLinear("edit-set-read"));

	it("span-add time grows less than 6x for 4x measures", () =>
		guardLinear("span-add"));

	it("gp-parse time grows less than 6x for 4x measures", () =>
		guardLinear("gp-parse"));

	it("pitch-history retention stays bounded with fixed entries", () =>
		guardRetention(true));

	it("pitch-history retention grows less than 6x with 4x entries", () =>
		guardRetention(false));
});
