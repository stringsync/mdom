import { describe, expect, it } from "bun:test";
import { MCData } from "./m-cdata";
import { MDOMParser } from "./m-dom-parser";
import { MElement } from "./m-element";
import { Measure } from "./measure";
import { MusicXMLSerializer } from "./music-xml-serializer";
import { Note } from "./note";
import { Part } from "./part";
import { Pitch } from "./pitch";
import { Score } from "./score";

describe("MDOMParser", () => {
	const parser = new MDOMParser();

	it("repairs an ending after a repeat without losing barline content", () => {
		const doc = parser.parseFromString(`<barline location="left" custom="kept">
			<bar-style color="#123456">heavy-light</bar-style>
			<fermata type="upright">normal</fermata>
			<repeat direction="forward" times="3"/>
			<ending number="1,2" type="start" print-object="no">First &amp; second</ending>
			<unmodeled flag="yes"/>
		</barline>`);
		const expected =
			parser.parseFromString(`<barline location="left" custom="kept">
			<bar-style color="#123456">heavy-light</bar-style>
			<fermata type="upright">normal</fermata>
			<ending number="1,2" type="start" print-object="no">First &amp; second</ending>
			<repeat direction="forward" times="3"/>
			<unmodeled flag="yes"/>
		</barline>`);
		const serializer = new MusicXMLSerializer();
		const once = serializer.serializeToString(doc);
		expect(once).toBe(serializer.serializeToString(expected));
		expect(serializer.serializeToString(parser.parseFromString(once))).toBe(
			once,
		);
		expect(
			doc.root.children.filter((child) => child.parent !== doc.root),
		).toEqual([]);
	});

	it.each([
		'<barline><ending number="1" type="stop"/><repeat direction="backward"/></barline>',
		'<barline><ending number="2" type="discontinue"/></barline>',
		'<barline><repeat direction="forward"/></barline>',
		"<barline><bar-style>regular</bar-style></barline>",
		"<unmodeled><repeat/><ending/></unmodeled>",
	])("preserves child order when no barline repair is needed: %s", (xml) => {
		const doc = parser.parseFromString(xml);
		const serialized = new MusicXMLSerializer().serializeToString(doc);
		expect(serialized.replace(/\n\s*/g, "")).toBe(xml);
	});

	it("builds typed nodes from the registry and leaves unknown tags as MElement", () => {
		const doc = parser.parseFromString(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note>
              <pitch>
                <step>C</step>
                <octave>4</octave>
              </pitch>
            </note>
            <unmodeled flag="yes"/>
          </measure>
        </part>
      </score-partwise>
    `);

		expect(doc.root).toBeInstanceOf(Score);

		const part = doc.score?.getPart("P1");
		expect(part).toBeInstanceOf(Part);

		const measure = part?.getMeasure("1");
		expect(measure).toBeInstanceOf(Measure);

		const note = measure?.notes[0];
		expect(note).toBeInstanceOf(Note);
		expect(note?.pitch).toBeInstanceOf(Pitch);

		const unknown = measure?.child("unmodeled");
		expect(unknown).toBeInstanceOf(MElement);
		expect(unknown?.getAttribute("flag")).toBe("yes");
	});

	it("preserves declaration + doctype metadata on parse", () => {
		const doc = parser.parseFromString(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise SYSTEM "partwise.dtd">
<score-partwise/>`);

		expect(doc.declaration).toEqual({ version: "1.0", encoding: "UTF-8" });
		expect(doc.doctype).toBe('score-partwise SYSTEM "partwise.dtd"');
	});

	it("drops whitespace-only text and comments but keeps significant text", () => {
		const doc = parser.parseFromString(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note>
              <!-- dropped -->
              <type>  whole  </type>
            </note>
          </measure>
        </part>
      </score-partwise>
    `);

		const note = doc.score?.getPart("P1")?.getMeasure("1")?.notes[0];
		expect(note).not.toBeUndefined();

		const elementChildren =
			note?.children.filter((mNode) => mNode instanceof MElement) ?? [];
		expect(
			elementChildren.map((mElement) => (mElement as MElement).tag),
		).toEqual(["type"]);

		expect(note?.type).toBe("  whole  ");
	});

	it("preserves CDATA sections through a parse + serialize round trip", () => {
		const doc = parser.parseFromString(
			`<score-partwise><credit><credit-words><![CDATA[a < b & c]]></credit-words></credit></score-partwise>`,
		);

		const words = doc.score?.child("credit")?.child("credit-words");
		expect(words?.children[0]).toBeInstanceOf(MCData);
		expect((words?.children[0] as MCData | undefined)?.value).toBe("a < b & c");

		const xml = new MusicXMLSerializer().serializeToString(doc);
		expect(xml).toContain("<![CDATA[a < b & c]]>");
	});

	it("throws when the XML has no root element", () => {
		expect(() => parser.parseFromString("<!-- no root -->")).toThrow(
			"MusicXML has no root element",
		);
	});
});
