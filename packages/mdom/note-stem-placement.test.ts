import { describe, expect, it } from "bun:test";
import type { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import { MusicXMLSerializer } from "./music-xml-serializer";

const SCORE = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <direction placement="above"><direction-type><words>dolce</words></direction-type></direction>
  <note>
    <pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type>
    <stem color="#FF0000">up</stem>
    <notations>
      <articulations><staccato placement="above"/></articulations>
      <ornaments><trill-mark/></ornaments>
      <dynamics><p/></dynamics>
      <other-notation type="single">x</other-notation>
    </notations>
  </note>
  <note>
    <pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type>
    <staff>1</staff>
  </note>
</measure></part></score-partwise>`;

function measureOf(xml: string) {
	return new MDOMParser()
		.parseFromString(xml)
		.score.getPart("P1")!
		.getMeasure("1")!;
}

function load() {
	const doc = new MDOMParser().parseFromString(SCORE);
	const measure = doc.score.getPart("P1")!.getMeasure("1")!;
	const [first, second] = measure.notes;
	return { doc, first: first!, second: second!, measure };
}

function reparse(doc: MDocument) {
	return measureOf(new MusicXMLSerializer().serializeToString(doc)).notes;
}

describe("Note.setStem", () => {
	it("changes the direction and keeps the stem's attributes", () => {
		const { doc, first } = load();
		first.setStem("down");
		expect(first.stem).toBe("down");
		expect(first.stemColor).not.toBeNull();
		expect(reparse(doc)[0]!.stem).toBe("down");
	});

	it("adds a missing stem before the staff", () => {
		const { doc, second } = load();
		second.setStem("double");
		const again = reparse(doc)[1]!;
		expect(again.stem).toBe("double");
		const tags = again.children
			.filter((child) => "tag" in child)
			.map((child) => (child as { tag: string }).tag);
		expect(tags.indexOf("stem")).toBeLessThan(tags.indexOf("staff"));
	});

	it("removes the stem with null", () => {
		const { doc, first } = load();
		first.setStem(null);
		expect(first.stem).toBeNull();
		expect(reparse(doc)[0]!.stem).toBeNull();
	});
});

describe("placement writes", () => {
	it("pins a note's marks, and null restores the default", () => {
		const { doc, first } = load();
		first.setPlacement("below");
		const again = reparse(doc)[0]!;
		expect(again.articulationMarks[0]!.placement).toBe("below");
		expect(again.ornaments[0]!.placement).toBe("below");
		expect(again.otherNotations[0]!.placement).toBe("below");
		first.setPlacement(null);
		expect(reparse(doc)[0]!.articulationMarks[0]!.placement).toBeNull();
		expect(reparse(doc)[0]!.otherNotations[0]!.placement).toBeNull();
	});

	it("pins a direction, and null restores the default", () => {
		const { doc, measure } = load();
		const direction = measure.directions[0]!;
		direction.setPlacement("below");
		const text = new MusicXMLSerializer().serializeToString(doc);
		expect(measureOf(text).directions[0]!.placement).toBe("below");
		direction.setPlacement(null);
		expect(
			measureOf(new MusicXMLSerializer().serializeToString(doc)).directions[0]!
				.placement,
		).toBeNull();
	});
});
