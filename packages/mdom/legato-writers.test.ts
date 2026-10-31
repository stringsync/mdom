import { describe, expect, it } from "bun:test";
import { MDOMParser } from "./m-dom-parser";

const SAMPLE = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
  <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
  <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

const notes = () =>
	new MDOMParser().parseFromString(SAMPLE).score.getPart("P1")!.getMeasure("1")!
		.notes;

describe("legato writers", () => {
	it("addSlide pairs markers with a line type and removeSlide undoes it", () => {
		const [first, second] = notes();
		const slide = first!.addSlide(second!, { lineType: "dashed" });
		expect(slide.slideType).toBe("start");
		expect(slide.lineType).toBe("dashed");
		expect(slide.partner?.note).toBe(second!);
		second!.removeSlide(first!);
		expect(first!.slides).toEqual([]);
		expect(second!.slides).toEqual([]);
	});

	it("addGlissando pairs markers", () => {
		const [first, second] = notes();
		first!.addGlissando(second!);
		expect(second!.glissandos[0]!.glissandoType).toBe("stop");
		first!.removeGlissando(second!);
		expect(second!.glissandos).toEqual([]);
	});

	it("addHammerOn and addPullOff write H/P text in technical", () => {
		const [first, second, child2] = notes();
		first!.addHammerOn(second!);
		second!.addPullOff(child2!);
		expect(first!.hammerOns[0]!.text).toBe("H");
		expect(second!.hammerOns[0]!.hammerOnType).toBe("stop");
		expect(second!.pullOffs[0]!.text).toBe("P");
		expect(child2!.pullOffs[0]!.partner?.note).toBe(second!);
		expect(first!.child("notations")!.child("technical")).not.toBeNull();
		first!.removeHammerOn(second!);
		second!.removePullOff(child2!);
		expect(second!.hammerOns).toEqual([]);
		expect(child2!.pullOffs).toEqual([]);
	});

	it("numbers do not collide between overlapping spans", () => {
		const [first2, second2, child] = notes();
		const first = first2!.addHammerOn(child!);
		const second = first2!.addHammerOn(second2!);
		expect(second.number).not.toBe(first.number);
	});

	it("addVibrato writes a wavy line, also over one note", () => {
		const [first, second] = notes();
		first!.addVibrato(second!);
		expect(first!.wavyLines[0]!.partner?.note).toBe(second!);
		second!.addVibrato(second!);
		expect(second!.wavyLines.length).toBe(3);
		first!.removeVibrato(second!);
		expect(first!.wavyLines).toEqual([]);
	});
});
