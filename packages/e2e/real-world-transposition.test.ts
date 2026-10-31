import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { MDOMParser, type Score } from "@stringsync/mdom";
import { schemaErrors } from "../mdom/music-xml-schema";
import { EXAMPLES, loadScore } from "./examples";

describe("W3C, a concert score with a transposed part declared", () => {
	const score = loadScore(EXAMPLES.CONCERT_SCORE_AND_FOR_PART);

	it("reads the concert flag, its octave transposition and the for-part", () => {
		expect(score.isConcertScore).toBe(true);
		const octave = score.getPart("P1")!.measures[0]!.getTranspose()!;
		expect([octave.diatonic, octave.chromatic, octave.octaveChange]).toEqual([
			0, 0, 1,
		]);
		const forPart = score.getPart("P3")!.measures[0]!.getForPart()!;
		expect(forPart.partClef!.sign).toBe("G");
		expect(forPart.partTranspose.semitones).toBe(-14);
		expect(score.getPart("P3")!.measures[0]!.getClef()!.sign).toBe("F");
		expect(score.getPart("P3")!.measures[0]!.getTranspose()).toBeNull();
	});
});

describe("Guitar Pro 7, a guitar written an octave up", () => {
	it("reads the per-staff transposition, separate from the clef", () => {
		const measure = loadScore(EXAMPLES.ALOOF_GP7).parts[0]!.measures[3]!;
		const guitar = measure.getTranspose("1")!;
		expect(guitar.staff).toBe("1");
		expect(guitar.semitones).toBe(-12);
		expect(measure.getTranspose("2")).toBeNull();
		expect(measure.notes[0]!.transpose).toBe(guitar);
	});
});

describe("LilyPond 72c, a transposition change", () => {
	it("carries the new transposition from the measure that changes it", () => {
		const measures = loadScore("lilypond/72c-TransposingInstruments-Change.xml")
			.parts[0]!.measures;
		expect(measures[0]!.getTranspose()!.chromatic).toBe(3);
		expect(measures[1]!.getTranspose()!.chromatic).toBe(-2);
		expect(measures[2]!.notes[0]!.transpose!.diatonic).toBe(-1);
	});
});

describe("LilyPond 72a-c, converting to concert pitch and back", () => {
	const sounding = (score: Score) =>
		score.parts.flatMap((part) =>
			part.measures.flatMap((measure) =>
				measure.notes.flatMap((note) => {
					const pitch = note.soundingPitch;
					return pitch ? [`${pitch.step}${pitch.alter}/${pitch.octave}`] : [];
				}),
			),
		);
	const written = (score: Score) =>
		score.parts.flatMap((part) =>
			part.measures.flatMap((measure) =>
				measure.notes.flatMap((note) =>
					note.pitch
						? [`${note.pitch.step}${note.pitch.alter}/${note.pitch.octave}`]
						: [],
				),
			),
		);

	for (const file of [
		"lilypond/72a-TransposingInstruments.xml",
		"lilypond/72b-TransposingInstruments-Full.xml",
		"lilypond/72c-TransposingInstruments-Change.xml",
	]) {
		it(`keeps every sounding pitch and returns to the written ones: ${file}`, () => {
			const doc = new MDOMParser().parseFromString(
				fs.readFileSync(path.join(__dirname, "examples", file), "utf-8"),
			);
			const score = doc.score;
			const original = { sounding: sounding(score), written: written(score) };
			score.convertToConcertScore();
			expect(score.isConcertScore).toBe(true);
			expect(sounding(score)).toEqual(original.sounding);
			expect(
				score.parts.every((part) =>
					part.measures.every((measure) =>
						measure.notes.every(
							(note) => !note.transpose || note.transpose.chromatic === 0,
						),
					),
				),
			).toBe(true);
			expect(schemaErrors(doc)).toEqual([]);
			score.convertToTransposedScore();
			expect(score.isConcertScore).toBe(false);
			expect(written(score)).toEqual(original.written);
			expect(sounding(score)).toEqual(original.sounding);
			expect(schemaErrors(doc)).toEqual([]);
		});
	}
});
