import { describe, expect, it } from "bun:test";
import { GuitarProScoreWriter } from "./guitar-pro-score-writer";
import { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import type { MElement } from "./m-element";
import { Measure } from "./measure";

describe("GuitarProScoreWriter dynamics and free text", () => {
	it("carries each staff its own dynamic across bars, voices and onsets", () => {
		const note = (staff: number, type = "quarter", duration = 1) =>
			`<note><pitch><step>C</step><octave>${6 - staff}</octave></pitch><duration>${duration}</duration><voice>${staff}</voice><type>${type}</type><staff>${staff}</staff></note>`;
		const direction = (staff: number, dynamic: string | null, words = "") =>
			`<direction>${words ? `<direction-type><words>${words}</words></direction-type>` : ""}${dynamic ? `<direction-type><dynamics><${dynamic}/></dynamics></direction-type>` : ""}<staff>${staff}</staff></direction>`;
		const lower = `<backup><duration>4</duration></backup>${note(2, "whole", 4)}`;
		const upper = note(1).repeat(4);
		const document = new MDOMParser().parseFromString(
			`<score-partwise><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">` +
				`<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>` +
				`${direction(1, "p")}${direction(2, "ff")}${upper}${lower}</measure>` +
				// Out of onset order: document order decides, so the later-written forte holds past beat 2.
				`<measure number="2"><forward><duration>2</duration></forward>${direction(1, "mf")}<backup><duration>2</duration></backup>` +
				`${direction(1, "f", "dolce")}${note(1).repeat(2)}${direction(1, null, "cresc. poco")}${note(1)}${direction(1, "mp")}${note(1)}${lower}</measure>` +
				`<measure number="3">${upper}${lower}</measure></part></score-partwise>`,
		);

		const root = new GuitarProScoreWriter().write(document).root;

		expect(beatsOfStaff(root, 0).map((bar) => bar.map(dynamicOf))).toEqual([
			["P", "P", "P", "P"],
			["F", "F", "F", "MP"],
			["MP", "MP", "MP", "MP"],
		]);
		expect(beatsOfStaff(root, 1).map((bar) => bar.map(dynamicOf))).toEqual([
			["FF"],
			["FF"],
			["FF"],
		]);
		expect(
			beatsOfStaff(root, 0)[1]!.map((beat) =>
				beat.childrenNamed("FreeText").map((text) => text.text),
			),
		).toEqual([["dolce"], [], ["cresc. poco"], []]);
	});

	it("reports an unsupported dynamic once, from the first beat it reaches", () => {
		const document = sfzScore();
		const unsupported: string[] = [];

		const root = new GuitarProScoreWriter({
			unsupported: "omit",
			onUnsupported: (feature) => unsupported.push(feature),
		}).write(document).root;

		expect(unsupported).toEqual(["dynamic sfz"]);
		expect(beatsOfStaff(root, 0)[1]!.map(dynamicOf)).toEqual([
			"F",
			"MP",
			"MP",
			"MP",
		]);
	});

	it("reads each measure’s directions a bounded number of times however long the score", () => {
		const small = reads(20);
		const large = reads(80);
		expect(large).toBeLessThanOrEqual(small * 4 + 8);
	});
});

function sfzScore(): MDocument {
	const document = MDocument.empty();
	const part = document.score.addPart({ name: "Guitar" });
	for (let index = 0; index < 4; index++) {
		const measure = part.addMeasure();
		if (index === 0) {
			measure.setTime({ beats: 4, beatType: 4 });
			measure.setClef({ sign: "G", line: 2 });
		}
		const voice = measure.getOrCreateVoice("1");
		for (let beat = 0; beat < 4; beat++) {
			if (index === 1 && beat === 1) {
				measure.addDirection({ dynamics: ["sfz", "mp"] });
			}
			voice.addNote({ step: "E", octave: 4, type: "quarter" });
		}
	}
	return document;
}

function reads(measures: number): number {
	const document = MDocument.empty();
	const part = document.score.addPart({ name: "Piano" });
	for (let index = 0; index < measures; index++) {
		const measure = part.addMeasure();
		if (index === 0) {
			measure.setTime({ beats: 4, beatType: 4 });
			measure.setClef({ sign: "G", line: 2 });
		}
		const voice = measure.getOrCreateVoice("1");
		for (let beat = 0; beat < 4; beat++) {
			if (index % 3 === 0) {
				measure.addDirection({ dynamics: beat % 2 ? "p" : "f" });
			}
			voice.addNote({ step: "G", octave: 4, type: "quarter" });
		}
	}
	const descriptor = Object.getOwnPropertyDescriptor(
		Measure.prototype,
		"directions",
	)!;
	let count = 0;
	Object.defineProperty(Measure.prototype, "directions", {
		...descriptor,
		get(this: Measure) {
			count++;
			return descriptor.get!.call(this);
		},
	});
	try {
		new GuitarProScoreWriter().write(document);
	} finally {
		Object.defineProperty(Measure.prototype, "directions", descriptor);
	}
	return count;
}

/** Each bar's beats on staff `staff` (0-based) of the first track, in order. */
function beatsOfStaff(root: MElement, staff: number): MElement[][] {
	const byId = (table: string) =>
		new Map(
			root
				.child(table)!
				.children.map((node) => [
					(node as MElement).getAttribute("id")!,
					node as MElement,
				]),
		);
	const bars = byId("Bars");
	const voices = byId("Voices");
	const beats = byId("Beats");
	const refs = (node: MElement | null | undefined) =>
		(node?.text ?? "").split(" ").filter((ref) => ref && ref !== "-1");
	return root
		.child("MasterBars")!
		.childrenNamed("MasterBar")
		.map((master) => {
			const bar = bars.get(refs(master.child("Bars"))[staff]!)!;
			return refs(bar.child("Voices")).flatMap((voice) =>
				refs(voices.get(voice)!.child("Beats")).map((beat) => beats.get(beat)!),
			);
		});
}

function dynamicOf(beat: MElement): string {
	return beat.child("Dynamic")!.text!;
}
