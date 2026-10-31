import { describe, expect, it } from "bun:test";
import { MDOMParser, MDocument, MusicXMLSerializer } from "./index";
import { schemaErrors } from "./music-xml-schema";

const parse = (xml: string) => new MDOMParser().parseFromString(xml);
const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);

const UNSET = {
	defaultX: null,
	defaultY: null,
	relativeX: null,
	relativeY: null,
};

// Shaped like Finale's export: every note, stem, slur and hairpin carries the
// coordinates the exporter laid it out at.
const ENGRAVED = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
	<part id="P1"><measure number="1">
		<attributes><divisions>2</divisions></attributes>
		<direction placement="below"><direction-type>
			<wedge type="crescendo" spread="0" default-y="-58" relative-x="-4.5" line-type="dashed" dash-length="5" space-length="3" niente="yes" color="#FF0000"/>
		</direction-type></direction>
		<note default-x="151" default-y="-12" print-spacing="no" print-dot="no">
			<pitch><step>A</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice>
			<type size="cue">quarter</type><stem default-y="-27">down</stem>
			<notations>
				<slur type="start" number="1" placement="above" default-x="6" default-y="22" bezier-x="9" bezier-y="33" bezier-offset="2" orientation="over" line-type="dotted"/>
				<tied type="start" bezier-x2="4" color="#00FF00"/>
			</notations>
			<lyric number="1" print-object="no"><text>la</text></lyric>
		</note>
		<direction><direction-type><wedge type="stop" spread="15"/></direction-type></direction>
		<direction><direction-type><dynamics default-x="3" default-y="-80"><p/></dynamics></direction-type></direction>
		<direction><direction-type><words relative-y="10">dolce</words></direction-type></direction>
		<note>
			<pitch><step>A</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice>
			<type>quarter</type>
			<notations><slur type="stop" number="1"/><tied type="stop"/></notations>
		</note>
		<harmony print-object="no"><root><root-step>C</root-step></root><kind>major</kind></harmony>
		<note print-object="no">
			<rest/><duration>4</duration><voice>1</voice><type>half</type><dot/>
		</note>
	</measure></part>
</score-partwise>`;

function fixture() {
	const doc = parse(ENGRAVED);
	const measure = doc.score.parts[0]!.measures[0]!;
	const [first, second, spacer] = measure.notes;
	const [crescendo, stop] = measure.directions.flatMap(
		(direction) => direction.wedges,
	);
	return {
		doc,
		measure,
		first: first!,
		second: second!,
		spacer: spacer!,
		crescendo: crescendo!,
		stop: stop!,
	};
}

describe("engraving geometry, reads", () => {
	const { doc, measure, first, second, spacer, crescendo, stop } = fixture();

	it("reads note and stem positions in tenths, null where the renderer places", () => {
		expect(first.position).toEqual({ ...UNSET, defaultX: 151, defaultY: -12 });
		expect(first.stemPosition).toEqual({ ...UNSET, defaultY: -27 });
		expect(second.position).toEqual(UNSET);
		expect(second.stemPosition).toBeNull();
	});

	it("keeps onsets independent of the coordinates", () => {
		expect([first.measureBeat, second.measureBeat]).toEqual([0, 1]);
	});

	it("reads the printout flags with their MusicXML defaults", () => {
		expect([first.printObject, first.printDot, first.printSpacing]).toEqual([
			true,
			false,
			false,
		]);
		expect(first.printLyric).toBe(true);
		// Unstated print-dot and print-lyric follow print-object.
		expect([spacer.printObject, spacer.printDot, spacer.printLyric]).toEqual([
			false,
			false,
			false,
		]);
		expect(spacer.printSpacing).toBe(true);
	});

	it("reads the type size as written", () => {
		expect(first.typeSize).toBe("cue");
		expect(second.typeSize).toBeNull();
		expect(spacer.typeSize).toBeNull();
	});

	it("reads slur and tie geometry", () => {
		const slur = first.slurs[0]!;
		expect(slur.position).toEqual({ ...UNSET, defaultX: 6, defaultY: 22 });
		expect(slur.bezier).toEqual({
			x: 9,
			y: 33,
			x2: null,
			y2: null,
			offset: 2,
			offset2: null,
		});
		expect(slur.orientation).toBe("over");
		expect(slur.lineType).toBe("dotted");
		expect(slur.lineStyle).toEqual({
			type: "dotted",
			dashLength: null,
			spaceLength: null,
		});
		expect(second.slurs[0]!.bezier.x).toBeNull();

		const tie = first.ties[0]!;
		expect(tie.bezier.x2).toBe(4);
		expect(tie.color).toBe("#00FF00");
		expect(tie.orientation).toBeNull();
		expect(tie.position).toEqual(UNSET);
	});

	it("reads wedge spread, niente and stroke at each end", () => {
		expect([crescendo.spread, stop.spread]).toEqual([0, 15]);
		expect([crescendo.niente, stop.niente]).toEqual([true, false]);
		expect(crescendo.lineStyle).toEqual({
			type: "dashed",
			dashLength: 5,
			spaceLength: 3,
		});
		expect(crescendo.position).toEqual({
			...UNSET,
			defaultY: -58,
			relativeX: -4.5,
		});
		expect(crescendo.color).toBe("#FF0000");
		expect(stop.lineStyle.type).toBeNull();
	});

	it("reads direction text and dynamics positions", () => {
		const [dynamics] = measure.directions.flatMap(
			(direction) => direction.dynamics,
		);
		const [words] = measure.directions.flatMap(
			(direction) => direction.wordsElements,
		);
		expect(dynamics!.position).toEqual({
			...UNSET,
			defaultX: 3,
			defaultY: -80,
		});
		expect(words!.position).toEqual({ ...UNSET, relativeY: 10 });
	});

	it("reads print-object on lyrics and chord symbols", () => {
		expect(first.lyrics[0]!.printObject).toBe(false);
		expect(measure.harmonies[0]!.printObject).toBe(false);
	});

	it("round-trips the untouched geometry", () => {
		expect(serialize(parse(serialize(doc)))).toBe(serialize(doc));
		expect(serialize(doc)).toContain('bezier-offset="2"');
	});
});

describe("engraving geometry, writes", () => {
	it("writes and clears positions, leaving other attributes alone", () => {
		const { doc, first, second } = fixture();
		first.setPosition({ defaultX: 120.5 });
		expect(first.position).toEqual({ ...UNSET, defaultX: 120.5 });
		expect(first.printSpacing).toBe(false);
		second.setPosition({ relativeX: -3, relativeY: 4 });
		first.setStemPosition({ defaultY: -30 });
		first.slurs[0]!.setPosition(null);
		expect(first.slurs[0]!.position).toEqual(UNSET);
		expect(first.slurs[0]!.bezier.x).toBe(9);
		expect(schemaErrors(doc)).toEqual([]);
		expect(() => second.setStemPosition({ defaultY: 0 })).toThrow();
	});

	it("writes the printout flags and the type size", () => {
		const { doc, first, second, spacer } = fixture();
		second.setPrintObject(false);
		second.setPrintSpacing(false);
		second.setPrintLyric(true);
		expect([second.printObject, second.printDot, second.printLyric]).toEqual([
			false,
			false,
			true,
		]);
		first.setPrintDot(null);
		first.setPrintSpacing(null);
		expect([first.printDot, first.printSpacing]).toEqual([true, true]);
		second.setTypeSize("large");
		first.setTypeSize(null);
		expect([first.typeSize, second.typeSize]).toEqual([null, "large"]);
		spacer.setPrintObject(true);
		expect(spacer.printDot).toBe(true);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("writes slur and tie curves", () => {
		const { doc, first, second } = fixture();
		const slur = second.slurs[0]!;
		slur.setBezier({ x: -26, y: 29 });
		slur.setOrientation("under");
		slur.setLineStyle({ type: "dashed", dashLength: 4, spaceLength: 2 });
		expect(slur.bezier).toMatchObject({ x: -26, y: 29, offset: null });
		expect(slur.orientation).toBe("under");
		expect(slur.lineType).toBe("dashed");
		const tie = first.ties[0]!;
		tie.setBezier(null);
		tie.setPosition({ defaultY: 5 });
		tie.setOrientation(null);
		expect(tie.bezier.x2).toBeNull();
		first.slurs[0]!.setLineStyle(null);
		expect(first.slurs[0]!.lineType).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("writes wedge geometry", () => {
		const { doc, crescendo, stop } = fixture();
		stop.setSpread(20);
		stop.setNiente(true);
		crescendo.setSpread(null);
		crescendo.setNiente(null);
		crescendo.setLineStyle({ type: "solid" });
		stop.setPosition({ defaultY: -60 });
		expect([crescendo.spread, stop.spread]).toEqual([null, 20]);
		expect([crescendo.niente, stop.niente]).toEqual([false, true]);
		expect(crescendo.lineStyle).toEqual({
			type: "solid",
			dashLength: null,
			spaceLength: null,
		});
		expect(stop.position.defaultY).toBe(-60);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("writes text, dynamics, lyric and harmony print attributes", () => {
		const { doc, measure, first } = fixture();
		const [dynamics] = measure.directions.flatMap(
			(direction) => direction.dynamics,
		);
		const [words] = measure.directions.flatMap(
			(direction) => direction.wordsElements,
		);
		dynamics!.setPosition({ relativeX: 2 });
		words!.setPosition({ defaultX: 0, defaultY: 40 });
		first.lyrics[0]!.setPrintObject(null);
		measure.harmonies[0]!.setPrintObject(true);
		expect(dynamics!.position).toEqual({ ...UNSET, relativeX: 2 });
		expect(words!.position).toMatchObject({ defaultX: 0, defaultY: 40 });
		expect(first.lyrics[0]!.printObject).toBe(true);
		expect(measure.harmonies[0]!.printObject).toBe(true);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("positions notes added to an empty score", () => {
		const doc = MDocument.empty();
		const note = doc.score
			.addPart({ name: "Flute" })
			.addMeasure()
			.getOrCreateVoice("1")
			.addNote({ step: "C", octave: 4, type: "quarter" });
		note.setPosition({ defaultX: 10 });
		note.setTypeSize("cue");
		expect(note.position.defaultX).toBe(10);
		expect(schemaErrors(doc)).toEqual([]);
	});
});
