import { describe, expect, it } from "bun:test";
import { MDOMParser, MDocument, MusicXMLSerializer } from "./index";
import { schemaErrors } from "./music-xml-schema";

function score() {
	const doc = MDocument.empty();
	const part = doc.score.addPart({ id: "P1", name: "Rhythm" });
	return { doc, part, measure: part.addMeasure() };
}
const xml = (doc: MDocument) => new MusicXMLSerializer().serializeToString(doc);
const roundTrip = (doc: MDocument) =>
	new MDOMParser().parseFromString(xml(doc));

describe("rhythm intent writers", () => {
	it("writes performed ratios and independent nested bracket labels, preserving another voice", () => {
		const { doc, measure } = score();
		const voice = measure.getOrCreateVoice("1");
		const notes = Array.from({ length: 3 }, () =>
			voice.addRest({
				type: "eighth",
				timeModification: {
					actual: 3,
					normal: 2,
					normalType: "eighth",
					normalDots: 1,
				},
			}),
		);
		const other = measure.getOrCreateVoice("2").addRest({ type: "whole" });
		expect(notes.map((note) => note.measureBeat)).toEqual([0, 1 / 3, 2 / 3]);
		expect(other.measureBeat).toBe(0);
		const bracket = notes[0]!.addTuplet(notes[2]!, {
			bracket: false,
			showNumber: "both",
			showType: "actual",
			lineShape: "curved",
			placement: "above",
			actual: { number: 7, type: "16th", dots: 1 },
			normal: { number: 5 },
		});
		const nested = notes[0]!.addTuplet(notes[1]!, {});
		expect(bracket.partner?.note).toBe(notes[2]!);
		expect(nested.number).not.toBe(bracket.number);
		expect(bracket.actual).toEqual({ number: 7, type: "16th", dots: 1 });
		expect(bracket.normal).toEqual({ number: 5, type: null, dots: 0 });
		expect(bracket.bracket).toBe(false);
		expect(nested.bracket).toBeNull();
		expect(bracket.lineShape).toBe("curved");
		notes[0]!.setDuration({ type: "quarter" });
		expect(notes[0]!.beats).toBe(2 / 3);
		expect(notes[1]!.measureBeat).toBe(2 / 3);
		expect(other.measureBeat).toBe(0);
		notes[0]!.setTimeModification(null);
		expect(notes[0]!.beats).toBe(1);
		expect(notes[1]!.measureBeat).toBe(1);
		expect(other.measureBeat).toBe(0);
		notes[0]!.setTimeModification({ actual: 5, normal: 4 });
		expect(notes[0]!.beats).toBe(0.8);
		expect(other.measureBeat).toBe(0);
		expect(schemaErrors(doc)).toEqual([]);
		const parsed = roundTrip(doc).score.parts[0]!.measures[0]!;
		expect(parsed.notes[1]!.timeModification).toEqual({
			actual: 3,
			normal: 2,
			normalType: "eighth",
			normalDots: 1,
		});
		expect(parsed.notes[0]!.tuplets[0]!.actual).toEqual(bracket.actual);
	});

	it("rejects unrepresentable ratios without mutating imported notes", () => {
		const { doc, measure } = score();
		measure.setDivisions(2);
		const note = measure.getOrCreateVoice("1").addRest({ type: "quarter" });
		const before = xml(doc);
		expect(() => note.setTimeModification({ actual: 3, normal: 2 })).toThrow(
			"fractional duration",
		);
		expect(() => note.setTimeModification({ actual: 0, normal: 2 })).toThrow();
		expect(() =>
			note.setTimeModification({ actual: 2, normal: 1, normalDots: 1 }),
		).toThrow();
		expect(xml(doc)).toBe(before);
	});

	it("supports chord and grace ratios and rolls back a rejected duration edit", () => {
		const { doc, measure } = score();
		const chord = measure.getOrCreateVoice("1").addChord(
			[
				{ step: "C", octave: 4 },
				{ step: "E", octave: 4 },
			],
			{ type: "quarter", timeModification: { actual: 7, normal: 4 } },
		);
		expect(chord.notes.map((note) => note.beats)).toEqual([4 / 7, 4 / 7]);
		expect(chord.notes.map((note) => note.measureBeat)).toEqual([0, 0]);
		const grace = measure.getOrCreateVoice("1").addRest({ type: "eighth" });
		grace.convertToGrace();
		grace.setTimeModification({ actual: 3, normal: 2 });
		grace.setDuration({ type: "16th", dots: 1 });
		expect(grace.duration).toBeNull();
		expect(grace.timeModification?.normalType).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
		const imported = score();
		imported.measure.setDivisions(3);
		const note = imported.measure
			.getOrCreateVoice("1")
			.addRest({ type: "quarter", timeModification: { actual: 3, normal: 2 } });
		const before = xml(imported.doc);
		expect(() => note.setDuration({ type: "16th", dots: 1 })).toThrow();
		expect(xml(imported.doc)).toBe(before);
	});

	it("writes nontraditional keys and staff-specific traditional cancellations", () => {
		const { doc, measure } = score();
		const key = measure.setKey({
			alterations: [
				{ step: "F", alter: 0.5, accidental: "quarter-sharp", octave: 4 },
				{ step: "B", alter: -1 },
			],
			staff: "2",
		});
		const traditional = measure.setKey({
			fifths: 1,
			mode: "major",
			cancel: { fifths: -2, location: "before-barline" },
			octaves: [
				{ number: 1, octave: 3, cancel: true },
				{ number: 1, octave: 4, cancel: false },
			],
		});
		expect(key.alterations).toEqual([
			{ step: "F", alter: 0.5, accidental: "quarter-sharp", octave: 4 },
			{ step: "B", alter: -1, accidental: null, octave: null },
		]);
		expect(traditional.cancel).toEqual({
			fifths: -2,
			location: "before-barline",
		});
		expect(traditional.octaves[0]!.cancel).toBe(true);
		expect(schemaErrors(doc)).toEqual([]);
		expect(xml(roundTrip(doc))).toBe(xml(doc));
	});

	it("writes additive, composite, interchangeable and unmetered signatures at onsets", () => {
		const { doc, measure } = score();
		const time = measure.setTime({
			components: [
				{ beats: "3+2", beatType: 8 },
				{ beats: 2, beatType: 4 },
			],
			interchangeable: {
				components: [{ beats: 9, beatType: 8 }],
				relation: "equals",
				symbol: "normal",
				separator: "diagonal",
			},
		});
		const staff = measure.setTime({ senzaMisura: "X", staff: "2" });
		expect(time.components).toEqual([
			{ beats: "3+2", beatType: "8" },
			{ beats: "2", beatType: "4" },
		]);
		expect(time.interchangeable?.relation).toBe("equals");
		expect(staff.senzaMisura).toBe("X");
		measure.getOrCreateVoice("1").addRest({ type: "quarter" });
		const empty = measure.setTime({ senzaMisura: true, onset: 1 });
		expect(empty.senzaMisura).toBe("");
		expect(time.senzaMisura).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
		expect(
			roundTrip(doc)
				.score.parts[0]!.measures[0]!.childrenNamed("attributes")
				.at(-1)!
				.child("time")!
				.child("senza-misura"),
		).not.toBeNull();
	});

	it("writes tied beat units, beat-unit modulation and notated metronome relationships", () => {
		const { doc, measure } = score();
		const rate = measure.addDirection({
			metronome: {
				beatUnit: "quarter",
				tied: [{ type: "eighth", dots: 1 }],
				perMinute: "ca. 120",
				parentheses: false,
			},
		}).metronomes[0]!;
		const modulation = measure.addDirection({
			metronome: {
				beatUnit: "quarter",
				dots: 1,
				equivalent: { type: "half", tied: [{ type: "eighth" }] },
			},
		}).metronomes[0]!;
		const mark = measure.addDirection({
			metronome: {
				arrows: true,
				left: [
					{
						type: "eighth",
						tied: "start",
						beams: [{ value: "begin", number: 1 }],
					},
					{ type: "eighth", tied: "stop", beams: ["end"] },
				],
				relation: {
					operator: "equals",
					right: [
						{
							type: "quarter",
							tuplet: {
								type: "start",
								actual: 3,
								normal: 2,
								normalType: "eighth",
								normalDots: 1,
								bracket: false,
								showNumber: "both",
							},
						},
					],
				},
			},
		}).metronomes[0]!;
		expect(rate.beatUnitGroups).toEqual([
			{ type: "quarter", dots: 0, tied: [{ type: "eighth", dots: 1 }] },
		]);
		expect(rate.getAttribute("parentheses")).toBe("no");
		expect(modulation.beatUnitGroups).toHaveLength(2);
		expect(modulation.perMinute).toBeNull();
		expect(mark.relationOperator).toBe("equals");
		expect(mark.arrows).toBe(true);
		expect(mark.relation!.left[0]!.tied).toBe("start");
		expect(mark.relation!.left[1]!.beamDetails).toEqual([
			{ value: "end", number: null },
		]);
		expect(mark.relation!.right[0]!.tuplet).toEqual({
			type: "start",
			actual: 3,
			normal: 2,
			normalType: "eighth",
			normalDots: 1,
			bracket: false,
			showNumber: "both",
		});
		measure.addDirection({ metronome: { left: [{ type: "quarter" }] } });
		expect(schemaErrors(doc)).toEqual([]);
		expect(xml(roundTrip(doc))).toBe(xml(doc));
	});
});
