import { describe, expect, it } from "bun:test";
import { MDOMParser, MDocument, MusicXMLSerializer, type Note } from "./index";
import { schemaErrors } from "./music-xml-schema";

function score() {
	const doc = MDocument.empty();
	const part = doc.score.addPart({ id: "P1", name: "Voice" });
	const voice = part.addMeasure().getOrCreateVoice("1");
	const notes = Array.from({ length: 4 }, () =>
		voice.addNote({ step: "C", octave: 4, type: "quarter" }),
	);
	return { doc, notes };
}
const xml = (doc: MDocument) => new MusicXMLSerializer().serializeToString(doc);
const reparsed = (doc: MDocument): Note[] =>
	new MDOMParser().parseFromString(xml(doc)).score.parts[0]!.measures[0]!.notes;

describe("lyric intent writers", () => {
	it("reads syllabic off hyphens and drops them from the text", () => {
		const { doc, notes } = score();
		notes[0]!.setLyric({ text: "Hal-" });
		notes[1]!.setLyric({ text: "-le-" });
		notes[2]!.setLyric({ text: "-lu" });
		notes[3]!.setLyric({ text: "jah" });
		expect(schemaErrors(doc)).toEqual([]);
		const lyrics = reparsed(doc).map((note) => note.lyrics[0]!);
		expect(lyrics.map((lyric) => lyric.syllable)).toEqual([
			"Hal",
			"le",
			"lu",
			"jah",
		]);
		expect(lyrics.map((lyric) => lyric.syllabic)).toEqual([
			"begin",
			"middle",
			"end",
			"single",
		]);
	});

	it("writes the text as given when syllabic is stated, and keeps a lone hyphen", () => {
		const { notes } = score();
		const stated = notes[0]!.setLyric({ text: "well-", syllabic: "single" });
		expect(stated.syllable).toBe("well-");
		expect(stated.syllabic).toBe("single");
		const dash = notes[1]!.setLyric({ text: "-" });
		expect(dash.syllable).toBe("-");
		expect(dash.syllabic).toBe("single");
	});

	it("keeps one lyric per verse, in verse order, and removes by verse", () => {
		const { doc, notes } = score();
		const note = notes[0]!;
		note.setLyric({ text: "three", verse: "3" });
		note.setLyric({ text: "one" });
		note.setLyric({ text: "two", verse: "2", name: "chorus" });
		note.setLyric({ text: "ten", verse: "10" });
		note.setLyric({ text: "uno" });
		note.addArticulation("staccato");
		expect(note.lyrics.map((lyric) => lyric.syllable)).toEqual([
			"uno",
			"two",
			"three",
			"ten",
		]);
		expect(note.getLyric("2")?.name).toBe("chorus");
		expect(note.getLyric("2", "verse")).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
		note.removeLyric("3");
		note.removeLyric("4");
		note.removeLyric();
		expect(
			reparsed(doc)[0]!.lyrics.map((lyric) => [lyric.verse, lyric.syllable]),
		).toEqual([
			["2", "two"],
			["10", "ten"],
		]);
	});

	it("writes elisions and melisma extenders schema-valid", () => {
		const { doc, notes } = score();
		notes[0]!.setLyric({
			text: ["look", "it-"],
			elision: "‿",
			placement: "below",
		});
		notes[1]!.setLyric({ text: "-ed", extend: "start" });
		notes[2]!.setLyric({ extend: "continue" });
		notes[3]!.setLyric({ extend: true, verse: "2", text: "oh" });
		expect(schemaErrors(doc)).toEqual([]);
		const [elided, held, carried, plain] = reparsed(doc).map(
			(note) => note.lyrics[0]!,
		);
		expect(elided!.syllable).toBe("lookit");
		expect(elided!.syllabic).toBe("begin");
		expect(elided!.placement).toBe("below");
		expect(elided!.runs.map((run) => [run.kind, run.text])).toEqual([
			["text", "look"],
			["elision", "‿"],
			["text", "it"],
		]);
		expect(held!.syllabic).toBe("end");
		expect([held!.extend, held!.extendType]).toEqual([true, "start"]);
		expect(carried!.syllable).toBe("");
		expect([carried!.extend, carried!.extendType]).toEqual([true, "continue"]);
		expect([plain!.verse, plain!.extend, plain!.extendType]).toEqual([
			"2",
			true,
			null,
		]);
	});

	it("rejects a lyric with nothing to sing or draw", () => {
		const { notes } = score();
		expect(() => notes[0]!.setLyric({})).toThrow("text or an extend");
		expect(() => notes[0]!.setLyric({ text: [] })).toThrow();
		expect(notes[0]!.lyrics).toEqual([]);
	});
});
