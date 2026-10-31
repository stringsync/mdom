import { describe, expect, it } from "bun:test";
import { MDocument } from "./m-document";

const build = () => {
	const measure = MDocument.empty()
		.score.addPart({ id: "P1", name: "X" })
		.addMeasure();
	measure.setDivisions(4);
	return measure.getOrCreateVoice("1");
};

describe("rare technical payloads", () => {
	it("round-trips hole, arrow, handbell and harmon-mute", () => {
		const note = build().addNote({ step: "C", octave: 4, type: "quarter" });
		note.setHole({
			holeType: "thumb",
			closed: "half",
			location: "top",
			shape: "circle",
		});
		note.setArrow({ direction: "up", style: "single", arrowhead: true });
		note.setHandbell("damp");
		note.setHarmonMute({ closed: "yes", location: "left" });
		const byType = (type: string) =>
			note.technicals.find((technical) => technical.technicalType === type)!;
		expect(byType("hole").hole).toEqual({
			holeType: "thumb",
			closed: "half",
			location: "top",
			shape: "circle",
		});
		expect(byType("arrow").arrow?.direction).toBe("up");
		expect(byType("handbell").handbell).toBe("damp");
		expect(byType("harmon-mute").harmonMute).toEqual({
			closed: "yes",
			location: "left",
		});
		note.setHandbell(null);
		expect(
			note.technicals.some(
				(technical) => technical.technicalType === "handbell",
			),
		).toBe(false);
	});

	it("writes line-shape and line-type on articulations", () => {
		const note = build().addNote({ step: "C", octave: 4, type: "quarter" });
		note.addArticulation("scoop", { lineShape: "curved", lineType: "wavy" });
		const mark = note.articulationMarks[0]!;
		expect(mark.lineShape).toBe("curved");
		expect(mark.lineType).toBe("wavy");
	});
});
