import { describe, expect, it } from "bun:test";
import { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import { MElement } from "./m-element";
import type { Measure } from "./measure";
import { schemaErrors } from "./music-xml-schema";
import { MusicXMLSerializer } from "./music-xml-serializer";
import type { Part } from "./part";

/** A one-part document of `count` 4/4 measures, each holding a whole note. */
const build = (count: number): { doc: MDocument; part: Part } => {
	const doc = MDocument.empty();
	const part = doc.score.addPart({ id: "P1", name: "Piano" });
	for (let index = 0; index < count; index++) {
		const measure = part.addMeasure();
		if (index === 0) {
			measure.setDivisions(4);
			measure.setClef({ sign: "G", line: 2 });
			measure.setTime({ beats: 4, beatType: 4 });
		}
	}
	return { doc, part };
};

const fill = (measure: Measure): void => {
	measure
		.getOrCreateVoice("1")
		.addNote({ step: "C", octave: 4, type: "whole" });
};

const roundTrip = (doc: MDocument): MDocument =>
	new MDOMParser().parseFromString(
		new MusicXMLSerializer().serializeToString(doc),
	);

describe("volta endings", () => {
	it("opens on the left barline and closes on the right, joining the repeat there", () => {
		const { doc, part } = build(3);
		const [first, second, third] = part.measures;
		first!.addBarline({ location: "left", repeat: { direction: "forward" } });
		fill(first!);
		second!.addEnding({ type: "start", number: [1] });
		fill(second!);
		second!.addBarline({ repeat: { direction: "backward" } });
		second!.addEnding({ type: "stop", number: [1] });
		third!.addEnding({ type: "start", number: [2, 3], text: "2.-3." });
		fill(third!);
		third!.addEnding({ type: "discontinue", number: [2, 3] });

		expect(second!.barlines).toHaveLength(2);
		const [open, close] = second!.barlines;
		expect(open!.location).toBe("left");
		expect(open!.ending).toEqual({
			type: "start",
			number: "1",
			numbers: [1],
			text: "1",
		});
		expect(close!.repeat).toBe("backward");
		expect(close!.ending?.type).toBe("stop");
		expect(second!.children.indexOf(open!)).toBe(0);
		expect(third!.barlines.map((barline) => barline.ending)).toEqual([
			{ type: "start", number: "2,3", numbers: [2, 3], text: "2.-3." },
			{ type: "discontinue", number: "2,3", numbers: [2, 3], text: "2,3" },
		]);
		expect(schemaErrors(doc)).toEqual([]);

		const reread = roundTrip(doc).score.getPart("P1")!.measures[2]!;
		expect(reread.barlines.map((barline) => barline.ending?.numbers)).toEqual([
			[2, 3],
			[2, 3],
		]);
		expect(reread.barlines[0]!.ending?.text).toBe("2.-3.");
	});

	it("joins a left barline already there, ahead of its repeat", () => {
		const { doc, part } = build(1);
		const measure = part.measures[0]!;
		measure.addBarline({ location: "left", repeat: { direction: "forward" } });
		measure.addEnding({ type: "start", number: [1] });
		fill(measure);
		measure.addEnding({ type: "stop", number: [1] });

		const [left] = measure.barlines;
		expect(measure.barlines).toHaveLength(2);
		expect(left!.childrenOfType(MElement).map((child) => child.tag)).toEqual([
			"ending",
			"repeat",
		]);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("adds a second right barline rather than stacking two endings on one", () => {
		const { part } = build(1);
		const measure = part.measures[0]!;
		fill(measure);
		measure.addEnding({ type: "stop", number: [1] });
		measure.addEnding({ type: "discontinue", number: [2] });
		expect(measure.barlines.map((barline) => barline.ending?.type)).toEqual([
			"stop",
			"discontinue",
		]);
	});

	it("keeps a raw number spelling and refuses passes that are not positive integers", () => {
		const { part } = build(1);
		const measure = part.measures[0]!;
		expect(
			measure.addEnding({ type: "start", number: " " }).ending,
		).toMatchObject({ number: " ", numbers: [] });
		expect(() => measure.addEnding({ type: "start", number: [0] })).toThrow(
			"ending passes must be positive integers",
		);
		expect(() => measure.addEnding({ type: "start", number: [] })).toThrow(
			"ending passes must be positive integers",
		);
	});

	it("reads the passes of a spaced list and of an out-of-spec range", () => {
		const measure = new MDOMParser()
			.parseFromString(
				`<score-partwise><part id="P1"><measure number="1">
          <barline location="left"><ending number="1, 2, 3" type="start"/></barline>
          <barline location="left"><ending number="1-3" type="start">1.-3.</ending></barline>
        </measure></part></score-partwise>`,
			)
			.score.getPart("P1")!.measures[0]!;
		expect(measure.barlines.map((barline) => barline.ending)).toEqual([
			{ type: "start", number: "1, 2, 3", numbers: [1, 2, 3], text: "1, 2, 3" },
			{ type: "start", number: "1-3", numbers: [1, 2, 3], text: "1.-3." },
		]);
	});
});

describe("navigation marks", () => {
	it("writes D.S. al Coda structure, printed and played, read back through directions and sounds", () => {
		const { doc, part } = build(4);
		const [first, second, third, fourth] = part.measures;
		const segno = first!.addNavigation({ kind: "segno" });
		fill(first!);
		fill(second!);
		const toCoda = second!.addNavigation({ kind: "to-coda" });
		fill(third!);
		const dalSegno = third!.addNavigation({ kind: "dal-segno", until: "coda" });
		const coda = fourth!.addNavigation({ kind: "coda" });
		fill(fourth!);

		expect(segno.navigations).toEqual(["segno"]);
		expect(segno.placement).toBe("above");
		expect(segno.sound?.segno).toBe("segno");
		expect(segno.nextNote).toBe(first!.notes[0]!);
		expect(toCoda.words).toEqual(["To Coda"]);
		expect(toCoda.sound?.toCoda).toBe("coda");
		expect(toCoda.measureBeat).toBe(4);
		expect(dalSegno.words).toEqual(["D.S. al Coda"]);
		expect(dalSegno.sound?.dalSegno).toBe("segno");
		expect(dalSegno.sound?.daCapo).toBe(false);
		expect(coda.navigations).toEqual(["coda"]);
		expect(coda.sound?.coda).toBe("coda");
		expect(schemaErrors(doc)).toEqual([]);

		const reread = roundTrip(doc).score.getPart("P1")!;
		const sounds = reread.measures.flatMap((measure) => measure.sounds);
		expect(
			sounds.map((sound) => [
				sound.segno,
				sound.toCoda,
				sound.dalSegno,
				sound.coda,
			]),
		).toEqual([
			["segno", null, null, null],
			[null, "coda", null, null],
			[null, null, "segno", null],
			[null, null, null, "coda"],
		]);
	});

	it("writes D.C. al Fine and the Fine it stops at", () => {
		const { doc, part } = build(2);
		const [first, second] = part.measures;
		fill(first!);
		const fine = first!.addNavigation({ kind: "fine" });
		fill(second!);
		const daCapo = second!.addNavigation({
			kind: "da-capo",
			until: "fine",
			placement: "below",
		});

		expect(fine.words).toEqual(["Fine"]);
		expect(fine.sound?.fine).toBe("yes");
		expect(daCapo.words).toEqual(["D.C. al Fine"]);
		expect(daCapo.sound?.daCapo).toBe(true);
		expect(daCapo.placement).toBe("below");
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("pairs named jumps with their landmarks and takes custom text", () => {
		const { doc, part } = build(1);
		const measure = part.measures[0]!;
		measure.addNavigation({ kind: "segno", id: "A" });
		fill(measure);
		const jump = measure.addNavigation({
			kind: "dal-segno",
			id: "A",
			text: "D.S. (senza rip.)",
		});
		expect(jump.sound?.dalSegno).toBe("A");
		expect(jump.words).toEqual(["D.S. (senza rip.)"]);
		expect(measure.sounds.map((sound) => sound.segno)).toEqual(["A", null]);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("places a mark at an onset after the notes are in", () => {
		const { doc, part } = build(1);
		const measure = part.measures[0]!;
		measure
			.getOrCreateVoice("1")
			.addNote({ step: "C", octave: 4, type: "half" });
		measure
			.getOrCreateVoice("1")
			.addNote({ step: "D", octave: 4, type: "half" });
		const coda = measure.addNavigation({ kind: "coda", onset: 2 });
		expect(coda.measureBeat).toBe(2);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("writes jump attributes through a plain direction, with a time-only and an implied repeat", () => {
		const { doc, part } = build(1);
		const measure = part.measures[0]!;
		const direction = measure.addDirection({
			words: "D.C.",
			sound: { daCapo: true, timeOnly: [2], forwardRepeat: true },
		});
		fill(measure);
		expect(direction.sound?.daCapo).toBe(true);
		expect(direction.sound?.timeOnly).toBe("2");
		expect(direction.sound?.forwardRepeat).toBe(true);
		expect(direction.sound?.tempo).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
	});
});
