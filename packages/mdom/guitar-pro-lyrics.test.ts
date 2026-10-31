import { describe, expect, it } from "bun:test";
import { GuitarProLyrics } from "./guitar-pro-lyrics";
import { GuitarProParser } from "./guitar-pro-parser";
import { GuitarProSerializer } from "./guitar-pro-serializer";
import { MDocument } from "./m-document";

describe("GuitarProLyrics.split", () => {
	it("splits words and hyphenated syllables", () => {
		expect(
			GuitarProLyrics.split("Hel-lo wor-ld a").map((syllable) => [
				syllable?.text,
				syllable?.syllabic,
			]),
		).toEqual([
			[["Hel"], "begin"],
			[["lo"], "end"],
			[["wor"], "begin"],
			[["ld"], "end"],
			[["a"], "single"],
		]);
	});

	it("continues a word across a hyphen followed by a space", () => {
		expect(
			GuitarProLyrics.split("lov- ing- ly").map(
				(syllable) => syllable?.syllabic,
			),
		).toEqual(["begin", "middle", "end"]);
	});

	it("elides with + and spaces with _, and skips a beat with a lone -", () => {
		expect(GuitarProLyrics.split("look+it - a_b")).toEqual([
			{ text: ["look", "it"], syllabic: "single" },
			null,
			{ text: ["a b"], syllabic: "single" },
		]);
	});
});

describe("Guitar Pro lyrics round trip", () => {
	it("skips rests and tied notes, keeps verses, and writes them back", async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: "Voice" }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: "G", line: 2 });
		const voice = measure.getOrCreateVoice("1");
		const first = voice.addNote({ step: "C", octave: 4, type: "quarter" });
		const second = voice.addNote({ step: "D", octave: 4, type: "quarter" });
		const third = voice.addNote({ step: "E", octave: 4, type: "quarter" });
		first.setLyric({ text: "Hel-" });
		first.setLyric({ text: "Yes", verse: "2" });
		second.setLyric({ text: "-lo" });
		third.setLyric({ text: "you", verse: "2" });

		const result = await new GuitarProParser().parseFromBytes(
			await new GuitarProSerializer().serializeToBytes(document),
		);
		const notes = result.score.parts[0]!.measures[0]!.notes.filter(
			(note) => !note.isRest,
		);

		expect(
			notes.map((note) =>
				note.lyrics.map((lyric) => [
					lyric.verse,
					lyric.syllable,
					lyric.syllabic,
				]),
			),
		).toEqual([
			[
				["1", "Hel", "begin"],
				["2", "Yes", "single"],
			],
			[["1", "lo", "end"]],
			[["2", "you", "single"]],
		]);
	});
});
