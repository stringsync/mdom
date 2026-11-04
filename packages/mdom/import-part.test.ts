import { describe, expect, it } from "bun:test";
import { MDOMParser } from "./m-dom-parser";
import { MusicXMLSerializer } from "./music-xml-serializer";

const parser = new MDOMParser();
const serializer = new MusicXMLSerializer();

describe("Score.importPart", () => {
	it("copies a tab part into another score, fresh ids, source untouched", () => {
		const source = parser.parseFromString(guitar(1));
		const before = serializer.serializeToString(source);
		const dest = parser.parseFromString(piano(1));

		const copy = dest.score.importPart(source.score.parts[0] as never);

		expect(serializer.serializeToString(source)).toBe(before);
		expect(dest.score.parts.map((item) => item.id)).toEqual(["P1", "P2"]);
		expect(copy.id).toBe("P2");
		expect(copy.label).toBe("Guitar");
		const xml = serializer.serializeToString(dest);
		expect(xml).toContain('<score-instrument id="P2-I1">');
		expect(xml).toContain('<instrument id="P2-I1"');
		expect(xml).toContain('<midi-instrument id="P2-I1">');
		expect(xml).toContain("<midi-program>26</midi-program>");
		expect(xml).toContain("<tuning-octave>2</tuning-octave>");
	});

	it("round-trips through serialization", () => {
		const dest = parser.parseFromString(piano(1));
		dest.score.importPart(
			parser.parseFromString(guitar(1)).score.parts[0] as never,
		);
		const reread = parser.parseFromString(serializer.serializeToString(dest));
		const part = reread.score.parts[1] as NonNullable<
			(typeof reread.score.parts)[number]
		>;
		expect(part.label).toBe("Guitar");
		expect(part.measures.length).toBe(2);
		const note = part.measures[0]?.childrenNamed("note")[0];
		expect(note?.child("staff")?.text).toBe("2");
		const technical = note?.child("notations")?.child("technical");
		expect(technical?.child("string")?.text).toBe("5");
		expect(technical?.child("fret")?.text).toBe("7");
		expect(part.measures[0]?.child("attributes")?.child("staves")?.text).toBe(
			"2",
		);
	});

	it("rescales durations to the score's divisions", () => {
		const dest = parser.parseFromString(piano(4));
		const copy = dest.score.importPart(
			parser.parseFromString(guitar(1)).score.parts[0] as never,
		);
		const first = copy.measures[0];
		expect(first?.child("attributes")?.child("divisions")?.text).toBe("4");
		expect(first?.childrenNamed("note")[0]?.child("duration")?.text).toBe("4");
		expect(first?.child("backup")?.child("duration")?.text).toBe("4");
	});

	it("refuses a rescale that leaves a fraction", () => {
		const odd = parser.parseFromString(
			guitar(3).replace(/<duration>3<\/duration>/, "<duration>1</duration>"),
		);
		expect(() =>
			parser
				.parseFromString(piano(2))
				.score.importPart(odd.score.parts[0] as never),
		).toThrow("not a whole number");
	});

	it("refuses a different measure count", () => {
		const dest = parser.parseFromString(piano(1, 3));
		expect(() =>
			dest.score.importPart(
				parser.parseFromString(guitar(1, 2)).score.parts[0] as never,
			),
		).toThrow("2 measures but the score has 3");
	});

	it("places the copy after a given part", () => {
		const dest = parser.parseFromString(piano(1));
		const second = dest.score.importPart(
			parser.parseFromString(guitar(1)).score.parts[0] as never,
		);
		const third = dest.score.importPart(
			parser.parseFromString(guitar(1)).score.parts[0] as never,
			{ after: "P1" },
		);
		expect(dest.score.parts.map((item) => item.id)).toEqual([
			"P1",
			third.id,
			second.id,
		]);
		expect(
			dest.score
				.child("part-list")
				?.childrenNamed("score-part")
				.map((entry) => entry.getAttribute("id")),
		).toEqual(["P1", third.id, second.id]);
	});
});

function piano(divisions: number, measures = 2) {
	return `<score-partwise version="4.0">
<part-list>
<score-part id="P1"><part-name>Piano</part-name>
<score-instrument id="P1-I1"><instrument-name>Piano</instrument-name></score-instrument>
<midi-instrument id="P1-I1"><midi-program>1</midi-program></midi-instrument>
</score-part>
</part-list>
<part id="P1">${Array.from(
		{ length: measures },
		(_, i) =>
			`<measure number="${i + 1}">${
				i === 0
					? `<attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>`
					: ""
			}<note><pitch><step>C</step><octave>4</octave></pitch><duration>${divisions}</duration><type>quarter</type></note></measure>`,
	).join("")}</part>
</score-partwise>`;
}

function guitar(divisions: number, measures = 2) {
	return `<score-partwise version="4.0">
<part-list>
<score-part id="P1"><part-name>Guitar</part-name>
<score-instrument id="P1-I1"><instrument-name>Guitar</instrument-name></score-instrument>
<midi-instrument id="P1-I1"><midi-program>26</midi-program></midi-instrument>
</score-part>
</part-list>
<part id="P1">${Array.from(
		{ length: measures },
		(_, i) =>
			`<measure number="${i + 1}">${
				i === 0
					? `<attributes><divisions>${divisions}</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>TAB</sign><line>5</line></clef><staff-details number="2"><staff-lines>6</staff-lines><staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning></staff-details></attributes>`
					: ""
			}<note><pitch><step>E</step><octave>3</octave></pitch><duration>${divisions}</duration><instrument id="P1-I1"/><voice>1</voice><type>quarter</type><staff>2</staff><notations><technical><string>5</string><fret>7</fret></technical></notations></note><backup><duration>${divisions}</duration></backup></measure>`,
	).join("")}</part>
</score-partwise>`;
}
