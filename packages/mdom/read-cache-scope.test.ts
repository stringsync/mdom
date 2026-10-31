import { describe, expect, it } from "bun:test";
import { Cursor } from "./cursor";
import type { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import { MElement } from "./m-element";
import { required } from "./m-node";
import type { Measure } from "./measure";
import type { Part } from "./part";
import { attributeBackFrom } from "./signature";
import { onsetOf } from "./timeline";

const NOTE =
	"<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>";

/** A part of `count` measures, a key of `fifths` declared in the first only. */
function score(count: number, fifths = 2): MDocument {
	const measures = Array.from(
		{ length: count },
		(_, index) =>
			`<measure number="${index + 1}">${
				index === 0
					? `<attributes><divisions>4</divisions><key><fifths>${fifths}</fifths></key></attributes>`
					: ""
			}${NOTE}${NOTE}</measure>`,
	);
	return new MDOMParser().parseFromString(
		`<score-partwise version="4.0"><part id="P1">${measures.join("")}</part></score-partwise>`,
	);
}

function partOf(doc: MDocument): Part {
	return required(doc.score.parts[0], "part");
}

function lastMeasure(doc: MDocument): Measure {
	return required(partOf(doc).measures.at(-1), "last measure");
}

/** Reads the carried `<fifths>`, counting how many `<attributes>` it visits. */
function carriedFifths(measure: Measure, visits: { count: number }) {
	return attributeBackFrom(measure, 0, "test-fifths", (attrs) => {
		visits.count++;
		return attrs.child("key")?.child("fifths")?.text ?? null;
	});
}

describe("read caches scoped to what changed", () => {
	it("keeps a carried signature across pitch edits in the same part", () => {
		const doc = score(200);
		const visits = { count: 0 };
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("2");
		const filled = visits.count;
		const measures = partOf(doc).measures;
		const reads = measures.map((measure) => {
			required(measure.notes[0], "note").setPitch({ step: "D", octave: 5 });
			return carriedFifths(lastMeasure(doc), visits);
		});
		expect(reads).toEqual(measures.map(() => "2"));
		expect(visits.count).toBe(filled);
	});

	it("keeps a source part’s caches while another document is written", () => {
		const source = score(50);
		const output = score(1);
		const visits = { count: 0 };
		carriedFifths(lastMeasure(source), visits);
		const filled = visits.count;
		const reads = Array.from({ length: 50 }, () => {
			partOf(output).addMeasure();
			return carriedFifths(lastMeasure(source), visits);
		});
		expect(reads).toEqual(Array.from({ length: 50 }, () => "2"));
		expect(visits.count).toBe(filled);
	});

	it("sees attribute text, element and attribute changes", () => {
		const doc = score(5);
		const visits = { count: 0 };
		const fifths = required(
			partOf(doc).measures[0]?.getKey()?.child("fifths"),
			"fifths",
		);
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("2");

		fifths.setText("-3");
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("-3");

		const third = required(partOf(doc).measures[2], "third measure");
		const attrs = new MElement("attributes");
		const key = new MElement("key");
		const declared = new MElement("fifths");
		declared.setText("4");
		key.append(declared);
		attrs.append(key);
		third.insertBefore(attrs, third.children[0] ?? null);
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("4");

		// Built while detached, then attached: still seen.
		declared.setText("5");
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("5");

		attrs.remove();
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("-3");
		declared.setText("6"); // detached now: no longer in effect
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("-3");
	});

	it("follows measures moved, added and removed", () => {
		const doc = score(4);
		const part = partOf(doc);
		const visits = { count: 0 };
		const [first, second] = part.measures;
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("2");
		expect(part.measures.indexOf(required(second, "second"))).toBe(1);

		part.append(required(first, "first"));
		expect(part.measures.at(-1)).toBe(required(first, "first"));
		expect(carriedFifths(required(second, "second"), visits)).toBeNull();
		expect(carriedFifths(required(first, "first"), visits)).toBeNull();

		part.insertBefore(required(first, "first"), required(second, "second"));
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("2");

		required(first, "first").remove();
		expect(carriedFifths(lastMeasure(doc), visits)).toBeNull();
		expect(part.measures).toHaveLength(3);
	});

	it("recomputes a cached null once a declaration appears", () => {
		const doc = score(3);
		const visits = { count: 0 };
		const staffTwo = () =>
			attributeBackFrom(lastMeasure(doc), 0, "test-staff-2", (attrs) => {
				visits.count++;
				return attrs.child("staves")?.text ?? null;
			});
		expect(staffTwo()).toBeNull();
		required(partOf(doc).measures[1], "second").setKey({ fifths: 1 });
		expect(staffTwo()).toBeNull();
		const staves = new MElement("staves");
		staves.setText("2");
		required(
			partOf(doc).measures[1]?.childrenNamed("attributes")[0],
			"attrs",
		).append(staves);
		expect(staffTwo()).toBe("2");
	});

	it("restores reads after rollback, undo and redo", () => {
		const doc = score(5);
		const history = doc.history;
		const visits = { count: 0 };
		const first = required(partOf(doc).measures[0], "first");
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("2");

		expect(() =>
			history.edit("Broken", () => {
				first.setKey({ fifths: -1 });
				expect(carriedFifths(lastMeasure(doc), visits)).toBe("-1");
				throw new Error("boom");
			}),
		).toThrow("boom");
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("2");

		history.edit("Key", () => first.setKey({ fifths: 3 }));
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("3");
		history.undo();
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("2");
		history.redo();
		expect(carriedFifths(lastMeasure(doc), visits)).toBe("3");

		const extra = history.edit("Add", () => partOf(doc).addMeasure());
		expect(lastMeasure(doc)).toBe(extra);
		history.undo();
		expect(lastMeasure(doc)).not.toBe(extra);
		expect(partOf(doc).measures).toHaveLength(5);
	});

	it("keeps onsets per measure, updating only the edited one", () => {
		const doc = score(2);
		const [first, second] = partOf(doc).measures;
		const firstNotes = required(first, "first").notes;
		const secondNotes = required(second, "second").notes;
		expect(
			onsetOf(required(first, "first"), required(firstNotes[1], "n")),
		).toBe(4);
		required(firstNotes[0]?.child("duration"), "duration").setText("8");
		expect(
			onsetOf(required(first, "first"), required(firstNotes[1], "n")),
		).toBe(8);
		expect(
			onsetOf(required(second, "second"), required(secondNotes[1], "n")),
		).toBe(4);
	});

	it("restamps a later measure’s cursor stops when divisions change earlier", () => {
		const doc = score(3);
		const voice = lastMeasure(doc).getOrCreateVoice("1");
		const second = required(voice.notes[1], "second note");
		expect(Cursor.at(voice, 1).note).toBe(second);
		required(partOf(doc).measures[0], "first").setDivisions(2);
		expect(Cursor.at(voice, 1).note).toBeNull();
		expect(Cursor.at(voice, 2).note).toBe(second);
	});
});
