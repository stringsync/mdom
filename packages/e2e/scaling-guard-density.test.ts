import { describe, it } from "bun:test";
import { guardRatio, seed } from "./scaling-guard-support";
import type { Operation } from "./scaling-operations";
import { syntheticScore } from "./scaling-score";

// Notes per measure grow at a fixed 16 measures: the audit's dense cursor walk
// (#42) rescanned each measure's prefix per note.
describe("notes-per-measure scaling guards (32 → 128)", () => {
	const densities = [32, 128] as const;
	const denseInputs = densities.map((notes) =>
		syntheticScore(seed, { measures: 16, parts: 1, voices: 1, notes }),
	);
	const guardDense = (operation: Operation) =>
		guardRatio(
			operation,
			denseInputs,
			densities.map((notes) => notes * 16),
			{ densities },
		);

	it("cursor time grows less than 6x for 4x notes per measure", () =>
		guardDense("cursor"));

	it("read-walk time grows less than 6x for 4x notes per measure", () =>
		guardDense("read-walk"));

	it("parse time grows less than 6x for 4x notes per measure", () =>
		guardDense("parse"));
});
