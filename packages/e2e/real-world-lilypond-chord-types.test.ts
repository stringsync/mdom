import { describe, expect, it } from "bun:test";
import { loadScore } from "./examples";

describe("LilyPond 71f, every chord type", () => {
	const measures = loadScore("lilypond/71f-AllChordTypes.xml").parts[0]!
		.measures;

	it("reads an inversion", () => {
		const [inverted] = measures[8]!.harmonies;
		expect(inverted!.root).toMatchObject({ step: "F", alter: 1 });
		expect(inverted!.inversion).toEqual({ value: 2, text: null });
	});

	it("reads a subtracted and an altered degree in order", () => {
		const degrees = measures[9]!.harmonies[0]!.degrees;
		expect(
			degrees.map((degree) => [degree.type, degree.value, degree.alter]),
		).toEqual([
			["subtract", 3, 0],
			["alter", 5, -1],
		]);
	});
});
