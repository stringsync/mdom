import { describe, expect, it } from "bun:test";
import type { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import type { MElement } from "./m-element";
import type { Note } from "./note";
import { Part } from "./part";
import { allocateSpanNumber } from "./spanner-numbers";

type Markers = (note: Note) => (MElement & { number: string })[];

const kinds = {
	slur: (note: Note) => note.slurs,
	tuplet: (note: Note) => note.tuplets,
	tie: (note: Note) => note.ties,
	glissando: (note: Note) => note.glissandos,
} satisfies Record<string, Markers>;
type Kind = keyof typeof kinds;

function add(kind: Kind, first: Note, last: Note): string {
	switch (kind) {
		case "slur":
			return first.addSlur(last).number;
		case "tuplet":
			return first.addTuplet(last).number;
		case "tie":
			return first.addTie(last).number;
		case "glissando":
			return first.addGlissando(last).number;
	}
}

/** The full-part scan the index replaces, kept as the reference it must match. */
function scannedNumber(first: Note, last: Note, existing: Markers): string {
	const part = first.closest(Part);
	const notes = part ? part.measures.flatMap((measure) => measure.notes) : [];
	const from = notes.indexOf(first);
	const to = notes.indexOf(last);
	const blocked = new Set<string>();
	const open = new Map<string, number>();
	notes.forEach((note, position) => {
		for (const marker of existing(note)) {
			const type = marker.getAttribute("type");
			if (type === "start") {
				open.set(marker.number, position);
			} else if (type === "stop") {
				const start = open.get(marker.number) ?? -Infinity;
				open.delete(marker.number);
				if (start <= to && position >= from) {
					blocked.add(marker.number);
				}
			}
		}
	});
	for (const [number, start] of open) {
		if (start <= to) {
			blocked.add(number);
		}
	}
	let candidate = 1;
	while (blocked.has(String(candidate))) {
		candidate++;
	}
	return String(candidate);
}

const note =
	"<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>";
function score(parts: number, measures: number, notes: number): MDocument {
	const ids = Array.from({ length: parts }, (_, index) => `P${index + 1}`);
	const measureXml = Array.from(
		{ length: measures },
		(_, index) =>
			`<measure number="${index + 1}">${note.repeat(notes)}</measure>`,
	).join("");
	return new MDOMParser().parseFromString(
		`<score-partwise><part-list>${ids
			.map(
				(id) =>
					`<score-part id="${id}"><part-name>${id}</part-name></score-part>`,
			)
			.join("")}</part-list>${ids
			.map((id) => `<part id="${id}">${measureXml}</part>`)
			.join("")}</score-partwise>`,
	);
}

function partNotes(part: Part): Note[] {
	return part.measures.flatMap((measure) => measure.notes);
}

/** A seeded generator, so a failing sequence replays. */
function random(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
}

describe("spanner number allocation", () => {
	it("matches a full-part scan through adds, raw edits, removals and moves", () => {
		const seeds = Array.from({ length: 20 }, (_unused, index) => index + 1);
		expect(seeds.flatMap(mismatchesForSeed)).toEqual([]);
	});

	it("rescans when a new span lands on a start a later start overrides", () => {
		const notes = partNotes(score(1, 1, 8).score.parts[0]!);
		const dropped = notes[2]!.addSlur(notes[6]!);
		const later = notes[5]!.addSlur(notes[7]!);
		dropped.partner!.remove();
		later.setAttribute("number", dropped.number);
		const outcomes = (
			[
				[1, 3],
				[0, 1],
			] as const
		).map(([first, last]) => ({
			expected: scannedNumber(notes[first]!, notes[last]!, kinds.slur),
			actual: notes[first]!.addSlur(notes[last]!).number,
		}));
		expect(outcomes.map((each) => each.actual)).toEqual(
			outcomes.map((each) => each.expected),
		);
	});

	it("numbers a detached note’s span 1", () => {
		const [first, last] = partNotes(score(1, 1, 2).score.parts[0]!);
		first!.addSlur(last!);
		first!.remove();
		expect(first!.addSlur(last!).number).toBe("1");
	});

	it("fills holes in the used numbers lowest first", () => {
		const notes = partNotes(score(1, 1, 8).score.parts[0]!);
		const spans = [1, 2, 3, 4].map((offset) =>
			notes[0]!.addSlur(notes[offset + 3]!),
		);
		expect(spans.map((span) => span.number)).toEqual(["1", "2", "3", "4"]);
		spans[1]!.partner?.remove();
		spans[1]!.remove();
		expect(notes[1]!.addSlur(notes[6]!).number).toBe("2");
		expect(notes[1]!.addSlur(notes[6]!).number).toBe("5");
	});

	it("stays exact across undo, redo and a rolled-back edit", () => {
		const document = score(1, 2, 4);
		const notes = partNotes(document.score.parts[0]!);
		const history = document.history;
		const outcomes: { expected: string; actual: string }[] = [];
		try {
			const check = (first: number, last: number) =>
				history.edit("slur", () => {
					const expected = scannedNumber(
						notes[first]!,
						notes[last]!,
						kinds.slur,
					);
					outcomes.push({
						expected,
						actual: notes[first]!.addSlur(notes[last]!).number,
					});
				});
			check(0, 7);
			check(1, 2);
			expect(() =>
				history.edit("abandoned", () => {
					notes[3]!.addSlur(notes[4]!);
					throw new Error("abandon");
				}),
			).toThrow("abandon");
			check(3, 4);
			history.undo();
			history.undo();
			check(1, 2);
			history.undo();
			history.redo();
			check(2, 5);
			expect(notes.flatMap((each) => each.slurs).length).toBe(6);
		} finally {
			history.dispose();
		}
		expect(outcomes.map((each) => each.actual)).toEqual(
			outcomes.map((each) => each.expected),
		);
	});

	it("reads each note’s markers once for a run of spans, not once per span", () => {
		const notes = partNotes(score(1, 64, 4).score.parts[0]!);
		const kind = {};
		let reads = 0;
		const counted = (each: Note) => {
			reads++;
			return each.slurs;
		};
		const numbers = notes.slice(1).map((last, offset) => {
			const first = notes[offset]!;
			return allocateSpanNumber(first, last, kind, counted, (number) => {
				first.addSlur(last);
				// Another note-local write in the same allocation keeps the index.
				first.setPitch({ step: "D", octave: 4 });
				return number;
			});
		});
		expect(new Set(numbers)).toEqual(new Set(["1", "2"]));
		expect(reads).toBe(notes.length);
	});
});

function mismatchesForSeed(seed: number) {
	const mismatches: {
		seed: number;
		step: number;
		expected: string;
		actual: string;
	}[] = [];
	const next = random(seed);
	const pick = <T>(items: readonly T[]): T =>
		items[Math.floor(next() * items.length)]!;
	const document = score(2, 4, 4);
	const parts = document.score.parts;
	const kindNames = Object.keys(kinds) as Kind[];
	for (let step = 0; step < 150; step++) {
		const part = pick(parts);
		const notes = partNotes(part);
		const roll = next();
		if (roll < 0.6 && notes.length) {
			const kind = pick(kindNames);
			const first = pick(notes);
			// Mostly forward spans, some reversed, same-note or into another part.
			const last = next() < 0.05 ? pick(partNotes(pick(parts))) : pick(notes);
			const expected = scannedNumber(first, last, kinds[kind]);
			const actual = add(kind, first, last);
			if (actual !== expected) {
				mismatches.push({ seed, step, expected, actual });
			}
			continue;
		}
		const markers = notes.flatMap((each) =>
			kindNames.flatMap((kind): MElement[] => kinds[kind](each)),
		);
		if (roll < 0.75 && markers.length) {
			// Raw renumbering opens holes and collisions the index must see.
			pick(markers).setAttribute("number", String(1 + Math.floor(next() * 4)));
		} else if (roll < 0.85 && markers.length) {
			pick(markers).remove();
		} else if (roll < 0.9 && markers.length) {
			pick(markers).setAttribute("type", next() < 0.5 ? "start" : "stop");
		} else if (roll < 0.95 && notes.length > 4) {
			pick(notes).remove();
		} else if (notes.length) {
			// Move a note into another part's measure.
			const moved = pick(notes);
			moved.remove();
			pick(pick(parts).measures).append(moved);
		}
	}
	return mismatches;
}
