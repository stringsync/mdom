import { describe, expect, it } from "bun:test";
import { Cursor } from "./cursor";
import { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import { MElement } from "./m-element";
import type { Part } from "./part";

// A two-measure single line: m1 = C D E F (quarters), m2 = G A. The cursor is an
// immutable caret addressed by (measure, voice, onset-in-beats), so moving
// returns a new cursor and `note` is a live lookup, null on a gap or past the
// last note.
function twoMeasures() {
	const part = MDocument.empty().score.addPart({ id: "P1" });
	const m1 = part.addMeasure();
	const firstBar = m1.getOrCreateVoice("1");
	firstBar.addNote({ step: "C", octave: 4, type: "quarter" });
	firstBar.addNote({ step: "D", octave: 4, type: "quarter" });
	firstBar.addNote({ step: "E", octave: 4, type: "quarter" });
	firstBar.addNote({ step: "F", octave: 4, type: "quarter" });
	const m2 = part.addMeasure();
	const secondBar = m2.getOrCreateVoice("1");
	secondBar.addNote({ step: "G", octave: 4, type: "quarter" });
	secondBar.addNote({ step: "A", octave: 4, type: "quarter" });
	return { part, m1, m2 };
}

describe("Cursor, an immutable timeline caret", () => {
	it("reads the note starting at its onset", () => {
		const { m1 } = twoMeasures();
		expect(Cursor.at(m1.getOrCreateVoice("1")).note?.pitch?.step).toBe("C");
		expect(Cursor.at(m1.getOrCreateVoice("1"), 2).note?.pitch?.step).toBe("E");
	});

	it("reads null on a gap and past the last note", () => {
		const voice = MDocument.empty()
			.score.addPart({ id: "P1" })
			.addMeasure()
			.getOrCreateVoice("1");
		voice.addNote({ step: "C", octave: 4, type: "quarter" }); // beat 0
		voice.addNote({ step: "G", octave: 4, type: "quarter", onset: 2 }); // beat 2, gap at beat 1

		expect(Cursor.at(voice, 1).note).toBeNull(); // the <forward> gap
		expect(Cursor.at(voice, 3).note).toBeNull(); // past the last note
	});

	it("steps note to note by onset", () => {
		const { m1 } = twoMeasures();
		const start = Cursor.at(m1.getOrCreateVoice("1"));
		expect(start.onset).toBe(0);
		expect(start.next()?.onset).toBe(1);
		expect(start.next()?.next()?.note?.pitch?.step).toBe("E");
	});

	it("crosses the barline into the next measure, same voice", () => {
		const { m1, m2 } = twoMeasures();
		const firstOfM2 = Cursor.at(m1.getOrCreateVoice("1"), 3).next(); // from F (m1) onward

		expect(firstOfM2?.measure).toBe(m2);
		expect(firstOfM2?.onset).toBe(0);
		expect(firstOfM2?.note?.pitch?.step).toBe("G");

		expect(firstOfM2?.prev()?.measure).toBe(m1);
		expect(firstOfM2?.prev()?.note?.pitch?.step).toBe("F");
	});

	it("returns null past the ends of the part", () => {
		const { m1, m2 } = twoMeasures();
		expect(Cursor.at(m1.getOrCreateVoice("1")).prev()).toBeNull(); // before the first note
		expect(Cursor.at(m2.getOrCreateVoice("1"), 1).next()).toBeNull(); // after the last note
	});

	it("is immutable, moving returns a new cursor, the old one stays put", () => {
		const { m1 } = twoMeasures();
		const here = Cursor.at(m1.getOrCreateVoice("1"));
		const next = here.next();

		expect(here.onset).toBe(0); // unchanged
		expect(next?.onset).toBe(1);
		expect(next).not.toBe(here);
	});

	it("looks the note up live, so appending elsewhere does not stale it", () => {
		const { m1 } = twoMeasures();
		const atBeat2 = Cursor.at(m1.getOrCreateVoice("1"), 2);
		expect(atBeat2.note?.pitch?.step).toBe("E");

		m1.getOrCreateVoice("1").addNote({ step: "B", octave: 4, type: "quarter" }); // append at beat 4
		expect(atBeat2.note?.pitch?.step).toBe("E"); // still E, the caret is a coordinate
	});

	it("tracks the onset, not a node: a removal pulls the next note under the caret", () => {
		const { m1 } = twoMeasures();
		const atBeat2 = Cursor.at(m1.getOrCreateVoice("1"), 2); // E
		m1.notes[1]!.remove(); // remove D; E, F pull back

		expect(atBeat2.note?.pitch?.step).toBe("F"); // beat 2 now holds F
	});

	it("treats a chord as a single stop on its onset", () => {
		const voice = MDocument.empty()
			.score.addPart({ id: "P1" })
			.addMeasure()
			.getOrCreateVoice("1");
		voice.addChord(
			[
				{ step: "C", octave: 4 },
				{ step: "E", octave: 4 },
				{ step: "G", octave: 4 },
			],
			{ type: "quarter" },
		);
		voice.addNote({ step: "D", octave: 4, type: "quarter" });

		const lead = Cursor.at(voice);
		expect(lead.note?.isChordMember).toBe(false);
		expect(lead.note?.pitch?.step).toBe("C"); // the chord's lead, not a member
		expect(lead.next()?.onset).toBe(1); // the chord added no extra stop
		expect(lead.next()?.note?.pitch?.step).toBe("D");
	});

	it("exposes the measure and voice it sits in (for object selection and writing)", () => {
		const { m1 } = twoMeasures();
		const cursor = Cursor.at(m1.getOrCreateVoice("1"));

		expect(cursor.measure).toBe(m1);
		expect(cursor.voice.id).toBe("1");
	});

	it("steps over grace notes, gaps and a mid-measure divisions change", () => {
		const note = (step: string, rest: string) =>
			`<note><pitch><step>${step}</step><octave>4</octave></pitch>${rest}<voice>1</voice></note>`;
		const part = new MDOMParser().parseFromString(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1">
<measure number="1"><attributes><divisions>1</divisions></attributes>${note("C", "<duration>1</duration>")}${note("D", "<grace/>")}${note("E", "<duration>1</duration>")}<forward><duration>1</duration></forward><attributes><divisions>2</divisions></attributes>${note("F", "<duration>2</duration>")}</measure>
<measure number="2"><attributes><divisions>4</divisions></attributes></measure>
<measure number="3">${note("G", "<duration>2</duration>")}${note("A", "<duration>2</duration>")}</measure></part></score-partwise>`,
		).score.parts[0]!;
		const [first, , last] = part.measures;

		// The grace note D shares E's onset: it is a stop, and next() leaves it for
		// the first later onset. F sits at beat 1.5 once divisions change to 2 mid-bar.
		expect(steps(Cursor.at(first!.getOrCreateVoice("1")), "next")).toEqual([
			"1:0:C",
			"1:1:D",
			"1:1.5:F",
			"3:0:G",
			"3:0.5:A",
		]);
		expect(steps(Cursor.at(last!.notes[1]!), "prev")).toEqual([
			"3:0.5:A",
			"3:0:G",
			"1:1.5:F",
			"1:1:D", // a caret at beat 1 reads its first stop, the grace note
			"1:0:C",
		]);
	});

	it("reads its stops afresh after an edit and an undo", () => {
		const { part, m1, m2 } = twoMeasures();
		const fromF = Cursor.at(m1.getOrCreateVoice("1"), 3);
		expect(fromF.next()?.note?.pitch?.step).toBe("G");

		m2.notes[0]!.remove();
		expect(fromF.next()?.note?.pitch?.step).toBe("A");
		m1.getOrCreateVoice("1").addNote({ step: "B", octave: 4, type: "quarter" });
		expect(fromF.next()?.measure).toBe(m1);
		expect(fromF.next()?.note?.pitch?.step).toBe("B");
		expect(part.measures).toHaveLength(2);
	});

	// Element children scanned under a walk: each read of `children` and each
	// typed or named child filter counts the children it can visit. Doubling the
	// measures or the notes per measure must about double the work, never square it.
	it("walks a score with work linear in measures and in notes per measure", () => {
		const base = walkWork(8, 16);
		expect(walkWork(16, 16) / base).toBeLessThan(2.5);
		expect(walkWork(8, 32) / base).toBeLessThan(2.5);
		expect(walkWork(8, 64) / walkWork(8, 32)).toBeLessThan(2.5);
	});
});

function steps(from: Cursor | null, move: "next" | "prev"): string[] {
	const found: string[] = [];
	for (let at = from; at; at = at[move]()) {
		found.push(`${at.measure.number}:${at.onset}:${at.note?.pitch?.step}`);
	}
	return found;
}

function walkWork(measures: number, notes: number): number {
	const part = MDocument.empty().score.addPart({ id: "P1" });
	for (let index = 0; index < measures; index++) {
		const voice = part.addMeasure().getOrCreateVoice("1");
		for (let at = 0; at < notes; at++) {
			voice.addNote({ step: "C", octave: 4, type: "16th" });
		}
	}
	return countScans(part, () => {
		let cursor: Cursor | null = Cursor.at(part.measures[0]!.notes[0]!);
		while (cursor) {
			cursor.note?.clef;
			cursor = cursor.next();
		}
		for (const measure of part.measures) {
			for (const note of measure.notes) {
				note.measureBeat;
				note.key;
				note.time;
			}
		}
	});
}

function countScans(part: Part, walk: () => void): number {
	expect(part.measures.length).toBeGreaterThan(0);
	const prototype = MElement.prototype;
	const children = Object.getOwnPropertyDescriptor(prototype, "children")!;
	const { childrenOfType, childrenNamed } = prototype;
	let scanned = 0;
	Object.defineProperty(prototype, "children", {
		...children,
		get(this: MElement) {
			const found = children.get!.call(this) as readonly unknown[];
			scanned += found.length;
			return found;
		},
	});
	prototype.childrenOfType = function (this: MElement, type) {
		const found = childrenOfType.call(this, type);
		scanned += this.children.length - found.length;
		return found;
	} as typeof childrenOfType;
	prototype.childrenNamed = function (this: MElement, tag) {
		const found = childrenNamed.call(this, tag);
		scanned += this.children.length - found.length;
		return found;
	};
	try {
		walk();
	} finally {
		Object.defineProperty(prototype, "children", children);
		prototype.childrenOfType = childrenOfType;
		prototype.childrenNamed = childrenNamed;
	}
	return scanned;
}
