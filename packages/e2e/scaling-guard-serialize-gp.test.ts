import { describe, it } from "bun:test";
import { guardRatio, seed } from "./scaling-guard-support";
import { syntheticScore } from "./scaling-score";

// Eight full exports at the usual sizes can exceed the test timeout under
// merge-gate load. A shorter axis preserves the same cold-cache 4x guard.
describe("bounded-density measure scaling guards (16 → 64)", () => {
	const serializeGpSizes = [16, 64] as const;
	const serializeGpInputs = serializeGpSizes.map((measures) =>
		syntheticScore(seed, { measures, parts: 1, voices: 1, notes: 4 }),
	);

	it("serialize-gp time grows less than 6x for 4x measures", () =>
		guardRatio(
			"serialize-gp",
			serializeGpInputs,
			serializeGpSizes.map((measures) => measures * 4),
			{ sizes: serializeGpSizes },
		));
});
