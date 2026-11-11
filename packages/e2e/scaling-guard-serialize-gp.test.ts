import { describe, it } from "bun:test";
import { guardRatio, seed } from "./scaling-guard-support";
import { ScoreBuilder } from "./scaling-score-builder";

// Eight full exports at the usual sizes can exceed the test timeout under
// merge-gate load. A shorter axis preserves the same cold-cache 4x guard.
describe("bounded-density measure scaling guards (16 → 64)", () => {
	const serializeGpSizes = [16, 64] as const;
	const serializeGpInputs = serializeGpSizes.map((measures) =>
		new ScoreBuilder(seed).synthetic({
			measures,
			parts: 1,
			voices: 1,
			notes: 4,
		}),
	);

	it("serialize-gp time grows less than 6x for 4x measures", () =>
		guardRatio(
			"serialize-gp",
			serializeGpInputs,
			serializeGpSizes.map((measures) => measures * 4),
			{ sizes: serializeGpSizes },
		));
});
