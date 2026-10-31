import { describe, expect, it } from "bun:test";
import { MDocument } from "./m-document";
import { schemaErrors } from "./music-xml-schema";

function scoreWithMeasures(numbers: string[]) {
	const doc = MDocument.empty();
	const part = doc.score.addPart({ id: "P1", name: "Measure edits" });
	const measures = numbers.map((number) => part.addMeasure({ number }));
	return { doc, part, measures };
}

describe("complete measure edits", () => {
	it("inserts a balanced measure with effective signatures and renumbers the run", () => {
		const { doc, part, measures } = scoreWithMeasures(["1", "2"]);
		const source = measures[0]!;
		source.setDivisions(4);
		source.setTime({ beats: 3, beatType: 4 });
		source.setClef({ sign: "G", line: 2 });

		const inserted = part.insertMeasureAfter(source);

		expect(part.measures[1]).toBe(inserted);
		expect(part.measures.map((measure) => measure.number)).toEqual([
			"1",
			"2",
			"3",
		]);
		expect(inserted.getClef()?.sign).toBe("G");
		expect(inserted.getTime()?.beats).toBe("3");
		expect(inserted.getTime()?.beatType).toBe("4");
		expect(inserted.notes).toHaveLength(1);
		const rest = inserted.notes[0]!;
		expect(rest.child("rest")?.getAttribute("measure")).toBe("yes");
		expect(rest.type).toBeNull();
		expect(rest.voice).toBe("1");
		expect(rest.duration).toBe(12);
		expect(rest.beats).toBe(3);
		expect(schemaErrors(doc)).toEqual([]);

		part.removeMeasure(source);
		expect(part.measures.map((measure) => measure.number)).toEqual(["1", "2"]);
	});

	it("uses signatures changed within the source measure", () => {
		const { part, measures } = scoreWithMeasures(["1"]);
		const source = measures[0]!;
		source.setDivisions(4);
		source.setTime({ beats: 3, beatType: 4 });
		source.getOrCreateVoice("1").addRest({ type: "quarter" });
		source.setTime({ beats: 5, beatType: 8, onset: 1 });

		const inserted = part.insertMeasureAfter(source);

		expect(inserted.getTime()?.beats).toBe("5");
		expect(inserted.getTime()?.beatType).toBe("8");
		expect(inserted.notes[0]!.duration).toBe(10);
		expect(inserted.notes[0]!.beats).toBe(2.5);
	});

	it("preserves pickup, suffixed, nonnumeric, and unrelated numeric labels", () => {
		const { part, measures } = scoreWithMeasures([
			"0",
			"1",
			"2",
			"12a",
			"7",
			"X",
		]);
		measures[0]!.setAttribute("implicit", "yes");
		measures[0]!.setTime({ beats: 3, beatType: 4 });

		const inserted = part.insertMeasureAfter(measures[2]!);
		expect(
			part.measures.map((measure) => measure.getAttribute("number")),
		).toEqual(["0", "1", "2", "3", "12a", "7", "X"]);

		part.removeMeasure(inserted);
		expect(
			part.measures.map((measure) => measure.getAttribute("number")),
		).toEqual(["0", "1", "2", "12a", "7", "X"]);
	});

	it("unlinks surviving span endpoints, including playback ties", () => {
		const { part, measures } = scoreWithMeasures(["1", "2", "3"]);
		measures[0]!.setDivisions(4);
		const notes = measures.map((measure) =>
			measure
				.getOrCreateVoice("1")
				.addNote({ step: "C", octave: 4, type: "whole" }),
		);
		const first = notes[0]!;
		const middle = notes[1]!;
		const last = notes[2]!;
		first.addSlur(middle);
		middle.addTie(last);
		first.addOctaveShift(middle, "8va");

		part.removeMeasure(measures[1]!);

		expect(first.slurs).toEqual([]);
		expect(last.ties).toEqual([]);
		expect(last.childrenNamed("tie")).toEqual([]);
		expect(middle.childrenNamed("tie")).toEqual([]);
		expect(
			measures[0]!.directions.flatMap((direction) => direction.octaveShifts),
		).toEqual([]);
		expect(
			measures[1]!.directions.flatMap((direction) => direction.octaveShifts),
		).toEqual([]);
		expect(part.measures.map((measure) => measure.number)).toEqual(["1", "2"]);
	});

	it("moves a final repeat-end barline to the preceding measure", () => {
		const { part, measures } = scoreWithMeasures(["1", "2"]);
		const boundary = measures[1]!.addBarline({
			location: "right",
			barStyle: "light-heavy",
			repeat: { direction: "backward", times: 2 },
		});
		measures[1]!.addBarline({ location: "right", barStyle: "dotted" });

		part.removeMeasure(measures[1]!);

		expect(measures[0]!.barlines).toEqual([boundary]);
		expect(measures[0]!.children.at(-1)).toBe(boundary);
		expect(boundary.repeatTimes).toBe(2);
	});

	it("leaves the only measure intact", () => {
		const { part, measures } = scoreWithMeasures(["1"]);
		const only = measures[0]!;

		part.removeMeasure(only);

		expect(part.measures).toEqual([only]);
		expect(only.parent).toBe(part);
	});
});
