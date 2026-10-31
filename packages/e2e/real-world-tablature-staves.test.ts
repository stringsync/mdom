import { describe, expect, it } from "bun:test";
import { loadScore } from "./examples";

describe("LilyPond 71e, tab staves", () => {
	const score = loadScore("lilypond/71e-TabStaves.xml");

	it("reads a six-line tuning and a staff that labels frets with letters", () => {
		const guitar = score.parts[0]!.measures[0]!.getStaffDetails()!;
		expect(guitar.staffLines).toBe(6);
		expect(guitar.staffTunings.map((tuning) => tuning.step)).toEqual([
			"E",
			"A",
			"D",
			"G",
			"B",
			"E",
		]);
		const lute = score.getPart("P7")!.measures[0]!.getStaffDetails()!;
		expect(lute.showFrets).toBe("letters");
		expect(guitar.showFrets).toBeNull();
	});
});
