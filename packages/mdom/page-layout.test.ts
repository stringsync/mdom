import { describe, expect, it } from "bun:test";
import { MDOMParser, MDocument, MusicXMLSerializer, PageLayout } from "./index";
import { MElement } from "./m-element";
import { schemaErrors } from "./music-xml-schema";
import type { Score } from "./score";

const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);
const parse = (xml: string) => new MDOMParser().parseFromString(xml);

function tags(element: MElement): string[] {
	return element.childrenOfType(MElement).map((child) => child.tag);
}

function scoreWithNote(): { doc: MDocument; score: Score } {
	const doc = MDocument.empty();
	const voice = doc.score
		.addPart({ id: "P1", name: "Piano" })
		.addMeasure()
		.getOrCreateVoice("1");
	voice.addNote({ step: "C", octave: 4, type: "whole" });
	return { doc, score: doc.score };
}

describe("page layout, reads", () => {
	const doc = parse(`
		<score-partwise>
			<defaults>
				<page-layout>
					<page-height>3560</page-height>
					<page-width>2797</page-width>
					<page-margins type="even">
						<left-margin>141</left-margin><right-margin>115</right-margin>
						<top-margin>127</top-margin><bottom-margin>45</bottom-margin>
					</page-margins>
					<page-margins type="odd">
						<left-margin>177</left-margin><right-margin>79</right-margin>
						<top-margin>127</top-margin>
					</page-margins>
				</page-layout>
			</defaults>
			<part id="P1"><measure number="1">
				<print new-page="yes" page-number="iv" blank-page="2">
					<page-layout><page-margins>
						<left-margin>10</left-margin><right-margin>20</right-margin>
						<top-margin>30</top-margin><bottom-margin>40</bottom-margin>
					</page-margins></page-layout>
					<measure-numbering system="only-top" staff="2" multiple-rest-range="yes">system</measure-numbering>
				</print>
			</measure></part>
		</score-partwise>`);
	const score = doc.score;
	const print = score.parts[0]!.measures[0]!.print!;

	it("reads the score-wide size and keeps each margin type and absent side", () => {
		const layout = score.pageLayout!;
		expect(layout).toBeInstanceOf(PageLayout);
		expect([layout.height, layout.width]).toEqual([3560, 2797]);
		expect(layout.margins).toEqual([
			{ type: "even", left: 141, right: 115, top: 127, bottom: 45 },
			{ type: "odd", left: 177, right: 79, top: 127, bottom: null },
		]);
		expect(layout.getMargins("odd")?.left).toBe(177);
		expect(layout.getMargins("even")?.left).toBe(141);
	});

	it("reads the print override, page number, blank pages and measure numbering", () => {
		expect(print.pageNumber).toBe("iv");
		expect(print.blankPage).toBe(2);
		const layout = print.pageLayout!;
		expect([layout.height, layout.width]).toEqual([null, null]);
		// An untyped block in a print applies to the current page, odd or even.
		expect(layout.getMargins("odd")).toEqual({
			type: null,
			left: 10,
			right: 20,
			top: 30,
			bottom: 40,
		});
		expect(print.measureNumbering).toEqual({
			value: "system",
			system: "only-top",
			staff: 2,
			multipleRestAlways: null,
			multipleRestRange: "yes",
		});
	});

	it("reads absence without writing anything", () => {
		const { doc: empty, score: bare } = scoreWithNote();
		const barePrint = bare.parts[0]!.measures[0]!.getOrCreatePrint();
		const withPrint = serialize(empty);
		expect(bare.pageLayout).toBeNull();
		expect(barePrint.pageLayout).toBeNull();
		expect(barePrint.pageNumber).toBeNull();
		expect(barePrint.blankPage).toBe(0);
		expect(barePrint.measureNumbering).toBeNull();
		expect(serialize(empty)).toBe(withPrint);
		expect(new PageLayout().getMargins("odd")).toBeNull();
	});
});

describe("page layout, writes", () => {
	it("writes score defaults in schema order around existing children", () => {
		const { doc, score } = scoreWithNote();
		score.getOrCreateSystemLayout().systemDistance = 120;
		const layout = score.getOrCreatePageLayout();
		expect(score.getOrCreatePageLayout()).toBe(layout);
		layout.setMargins("both", { left: 70, right: 70, top: 80, bottom: 90 });
		layout.setSize({ height: 1700, width: 1200 });

		expect(tags(score.child("defaults")!)).toEqual([
			"page-layout",
			"system-layout",
		]);
		expect(tags(layout)).toEqual(["page-height", "page-width", "page-margins"]);
		expect(schemaErrors(doc)).toEqual([]);

		const reread = parse(serialize(doc)).score.pageLayout!;
		expect([reread.height, reread.width]).toEqual([1700, 1200]);
		expect(reread.margins).toEqual([
			{ type: "both", left: 70, right: 70, top: 80, bottom: 90 },
		]);
	});

	it("splits shared margins into odd and even, and joins them with both", () => {
		const layout = new PageLayout();
		layout.setMargins("both", { left: 1, right: 2, top: 3, bottom: 4 });
		layout.setMargins("odd", { left: 5, right: 6, top: 7, bottom: 8 });
		expect(layout.margins.map((each) => [each.type, each.left])).toEqual([
			["even", 1],
			["odd", 5],
		]);
		layout.setMargins("odd", { left: 9, right: 6, top: 7, bottom: 8 });
		expect(layout.margins.map((each) => [each.type, each.left])).toEqual([
			["even", 1],
			["odd", 9],
		]);
		layout.setMargins("even", null);
		expect(layout.margins.map((each) => each.type)).toEqual(["odd"]);
		layout.setMargins("both", { left: 0, right: 0, top: 0, bottom: 0 });
		expect(layout.margins.map((each) => each.type)).toEqual(["both"]);
		layout.setSize({ height: 10, width: 20 });
		layout.setSize(null);
		expect(tags(layout)).toEqual(["page-margins"]);
	});

	it("writes print overrides in schema order and validates", () => {
		const { doc, score } = scoreWithNote();
		const print = score.parts[0]!.measures[0]!.getOrCreatePrint();
		// Written out of order; the print sequence must still come out right.
		print.setMeasureNumbering({ value: "measure", system: "also-top" });
		print.getOrCreateSystemLayout().systemDistance = 100;
		print
			.getOrCreatePageLayout()
			.setMargins("both", { left: 1, right: 2, top: 3, bottom: 4 });
		print.setPageNumber("5");
		print.setBlankPage(1);

		expect(tags(print)).toEqual([
			"page-layout",
			"system-layout",
			"measure-numbering",
		]);
		expect(print.newPage).toBe(true);
		expect(schemaErrors(doc)).toEqual([]);

		const reread = parse(serialize(doc)).score.parts[0]!.measures[0]!.print!;
		expect(reread.pageNumber).toBe("5");
		expect(reread.blankPage).toBe(1);
		expect(reread.measureNumbering).toMatchObject({
			value: "measure",
			system: "also-top",
		});
	});

	it("patches measure numbering, keeping formatting and clearing on null", () => {
		const doc = parse(`
			<score-partwise><part id="P1"><measure number="1">
				<print><measure-numbering staff="2" font-size="9">none</measure-numbering></print>
			</measure></part></score-partwise>`);
		const print = doc.score.parts[0]!.measures[0]!.print!;
		print.setMeasureNumbering({ value: "system", staff: null });
		const node = print.child("measure-numbering")!;
		expect(node.text).toBe("system");
		expect(node.getAttribute("staff")).toBeNull();
		expect(node.getAttribute("font-size")).toBe("9");

		print.setMeasureNumbering(null);
		print.setPageNumber(null);
		print.setBlankPage(0);
		expect(print.measureNumbering).toBeNull();
		expect(() => print.setBlankPage(1.5)).toThrow();
	});
});
