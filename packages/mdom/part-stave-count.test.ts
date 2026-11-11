import { describe, expect, it } from "bun:test";
import { MDOMParser } from "./m-dom-parser";
import type { Measure } from "./measure";

describe("staveCount without <staves>", () => {
	const build = (inner: string): Measure =>
		new MDOMParser()
			.parseFromString(
				`<score-partwise><part id="P1"><measure number="1">${inner}</measure></part></score-partwise>`,
			)
			.score.getPart("P1")!.measures[0]!;

	it("counts the highest numbered clef", () => {
		const measure = build(
			`<attributes><clef number="1"><sign>G</sign></clef><clef number="2"><sign>F</sign></clef></attributes>`,
		);
		expect(measure.staveCount).toBe(2);
		expect(measure.part.staveCount).toBe(2);
	});

	it("counts notes on staff 2 with no clef", () => {
		const measure = build(
			`<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><staff>2</staff></note>`,
		);
		expect(measure.part.staveCount).toBe(2);
	});

	it("is 1 for a single staff", () => {
		expect(
			build(`<attributes><clef><sign>G</sign></clef></attributes>`).staveCount,
		).toBe(1);
	});
});
