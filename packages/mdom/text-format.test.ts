import { describe, expect, it } from "bun:test";
import {
	MDOMParser,
	MDocument,
	MusicXMLSerializer,
	Rehearsal,
	Words,
} from "./index";
import { MElement } from "./m-element";
import { schemaErrors } from "./music-xml-schema";

const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);
const parse = (xml: string) => new MDOMParser().parseFromString(xml);

function tags(element: MElement): string[] {
	return element.childrenOfType(MElement).map((child) => child.tag);
}

describe("text formatting, reads", () => {
	const doc = parse(`
		<score-partwise>
			<defaults>
				<scaling><millimeters>7</millimeters><tenths>40</tenths></scaling>
				<music-font font-family="Bravura" font-size="20"/>
				<word-font font-family="Times New Roman" font-size="10.25"/>
				<lyric-font font-family="Georgia" font-size="11"/>
				<lyric-font number="2" font-style="italic"/>
				<lyric-font number="2" name="chorus" font-weight="bold"/>
				<lyric-language xml:lang="en"/>
				<lyric-language number="2" xml:lang="de"/>
			</defaults>
			<part id="P1"><measure number="1">
				<direction><direction-type>
					<words font-size="large" font-style="italic" halign="right" valign="top" justify="center">dolce</words>
				</direction-type></direction>
				<direction><direction-type>
					<rehearsal font-family="Arial" font-weight="bold" enclosure="square">A</rehearsal>
				</direction-type></direction>
				<direction><direction-type><words>plain</words></direction-type></direction>
				<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
					<lyric number="2"><text font-weight="bold">la</text><elision font-size="8">_</elision><text>a</text></lyric>
					<lyric number="2" name="chorus"><text>oh</text></lyric>
					<lyric number="3"><text>ah</text></lyric>
				</note>
			</measure></part>
		</score-partwise>`);
	const score = doc.score;
	const measure = score.parts[0]!.measures[0]!;
	const [dolce, plain] = measure.directions.flatMap(
		(direction) => direction.wordsElements,
	);
	const rehearsal = measure.directions.flatMap(
		(direction) => direction.rehearsals,
	)[0]!;
	const lyrics = measure.notes[0]!.lyrics;

	it("reads the score default fonts, numeric and keyword sizes alike", () => {
		expect(score.musicFont).toEqual({
			family: "Bravura",
			size: 20,
			style: null,
			weight: null,
		});
		expect(score.wordFont).toMatchObject({
			family: "Times New Roman",
			size: 10.25,
		});
		expect(dolce!.font.size).toBe("large");
		expect(MDocument.empty().score.wordFont).toBeNull();
	});

	it("matches lyric fonts and languages by verse and name, the most specific winning", () => {
		expect(score.lyricFonts.map((each) => each.number)).toEqual([
			null,
			"2",
			"2",
		]);
		expect(score.getLyricFont()!.font.family).toBe("Georgia");
		expect(score.getLyricFont("2")!.font.style).toBe("italic");
		expect(score.getLyricFont("2", "chorus")!.font.weight).toBe("bold");
		expect(score.getLyricFont("5")!.number).toBeNull();
		expect(score.getLyricLanguage("3")!.language).toBe("en");
		expect(score.getLyricLanguage("2", "chorus")!.language).toBe("de");
	});

	it("reads explicit words and rehearsal formatting, null where it inherits", () => {
		expect(dolce).toBeInstanceOf(Words);
		expect([dolce!.halign, dolce!.valign, dolce!.justify]).toEqual([
			"right",
			"top",
			"center",
		]);
		expect(plain!.font).toEqual({
			family: null,
			size: null,
			style: null,
			weight: null,
		});
		expect(plain!.halign).toBeNull();
		expect(rehearsal).toBeInstanceOf(Rehearsal);
		expect(rehearsal.font).toMatchObject({ family: "Arial", weight: "bold" });
	});

	it("resolves unstated words fields from the word font", () => {
		expect(plain!.resolvedFont).toEqual({
			family: "Times New Roman",
			size: 10.25,
			style: null,
			weight: null,
		});
		expect(dolce!.resolvedFont).toMatchObject({
			family: "Times New Roman",
			size: "large",
			style: "italic",
		});
		expect(rehearsal.resolvedFont.family).toBe("Arial");
		expect(new Words().resolvedFont.family).toBeNull();
	});

	it("keeps each lyric run its own formatting, resolved against its verse font", () => {
		const runs = lyrics[0]!.runs;
		expect(runs.map((run) => run.font.weight)).toEqual(["bold", null, null]);
		expect(runs[1]!.font.size).toBe(8);
		expect(runs[2]!.resolvedFont).toEqual({
			family: null,
			size: null,
			style: "italic",
			weight: null,
		});
		expect(lyrics[1]!.name).toBe("chorus");
		expect(lyrics[1]!.inheritedFont!.weight).toBe("bold");
		expect(lyrics[2]!.runs[0]!.resolvedFont.family).toBe("Georgia");
	});
});

describe("text formatting, writes", () => {
	it("writes default fonts and lyric defaults in schema order, and removes them", () => {
		const doc = MDocument.empty();
		const score = doc.score;
		score
			.addPart({ id: "P1", name: "Voice" })
			.addMeasure()
			.getOrCreateVoice("1")
			.addNote({ step: "C", octave: 4, type: "whole" });
		score.setLyricLanguage("de", { number: "2" });
		score.setLyricFont({ family: "Georgia", size: 11 });
		score.setWordFont({ family: "Times New Roman", size: "small" });
		score.setMusicFont({ family: "Bravura" });
		score.getOrCreatePageLayout().setSize({ height: 1683, width: 1190 });
		score.setLyricFont({ style: "italic" }, { number: "2", name: "chorus" });
		score.setLyricLanguage("en");
		const defaults = score.child("defaults")!;
		expect(tags(defaults)).toEqual([
			"page-layout",
			"music-font",
			"word-font",
			"lyric-font",
			"lyric-font",
			"lyric-language",
			"lyric-language",
		]);
		expect(score.getLyricLanguage("1")!.language).toBe("en");
		expect(score.getLyricFont("2", "chorus")!.font.style).toBe("italic");
		expect(schemaErrors(doc)).toEqual([]);

		score.setWordFont({ family: "Palatino" });
		expect(score.wordFont).toEqual({
			family: "Palatino",
			size: null,
			style: null,
			weight: null,
		});
		score.setLyricFont({ weight: "bold" }, { number: "2", name: "chorus" });
		expect(score.lyricFonts).toHaveLength(2);
		score.setMusicFont(null);
		score.setLyricLanguage(null, { number: "2" });
		score.setLyricFont(null);
		expect(tags(defaults)).toEqual([
			"page-layout",
			"word-font",
			"lyric-font",
			"lyric-language",
		]);
	});

	it("writes words formatting from the direction spec and in place", () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ id: "P1" }).addMeasure();
		measure
			.getOrCreateVoice("1")
			.addNote({ step: "C", octave: 4, type: "whole" });
		const direction = measure.addDirection({
			words: {
				text: "Swing",
				fontFamily: "Arial",
				fontSize: 12,
				halign: "left",
				valign: "baseline",
				justify: "left",
			},
		});
		const words = direction.wordsElements[0]!;
		expect(words.font).toMatchObject({ family: "Arial", size: 12 });
		expect([words.halign, words.valign, words.justify]).toEqual([
			"left",
			"baseline",
			"left",
		]);
		expect(schemaErrors(doc)).toEqual([]);

		words.setFont({ style: "italic" });
		words.setHalign(null);
		words.setValign("middle");
		expect(words.font).toEqual({
			family: null,
			size: null,
			style: "italic",
			weight: null,
		});
		expect(words.halign).toBeNull();
		expect(words.valign).toBe("middle");
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("formats rehearsal marks and lyric runs in place", () => {
		const doc = parse(`
			<score-partwise version="4.0">
				<part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
				<part id="P1"><measure number="1">
					<attributes><divisions>1</divisions></attributes>
					<direction><direction-type><rehearsal>B</rehearsal></direction-type></direction>
					<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type>
						<lyric><syllabic>single</syllabic><text>la</text><elision/><text>a</text></lyric>
					</note>
				</measure></part>
			</score-partwise>`);
		const measure = doc.score.parts[0]!.measures[0]!;
		const rehearsal = measure.directions[0]!.rehearsals[0]!;
		rehearsal.setFont({ family: "Arial", size: 14, weight: "bold" });
		rehearsal.setJustify("center");
		const lyric = measure.notes[0]!.lyrics[0]!;
		lyric.setRunFont(2, { style: "italic" });
		lyric.setRunFont(1, { size: "x-small" });
		expect(rehearsal.font.size).toBe(14);
		expect(rehearsal.justify).toBe("center");
		expect(lyric.runs.map((run) => run.font.style)).toEqual([
			null,
			null,
			"italic",
		]);
		expect(lyric.runs[1]!.font.size).toBe("x-small");
		expect(() => lyric.setRunFont(3, null)).toThrow(RangeError);
		expect(schemaErrors(doc)).toEqual([]);

		lyric.setRunFont(2, null);
		expect(lyric.runs[2]!.font.style).toBeNull();
	});

	it("round-trips formatting it does not read", () => {
		const xml = `<words font-size="9" underline="1" letter-spacing="normal">x</words>`;
		const doc = parse(
			`<score-partwise><part id="P1"><measure number="1"><direction><direction-type>${xml}</direction-type></direction></measure></part></score-partwise>`,
		);
		expect(serialize(doc)).toContain(xml);
	});
});
