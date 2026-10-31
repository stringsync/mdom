import { afterEach, describe, expect, it } from "bun:test";
import { GuitarProParser } from "./guitar-pro-parser";
import { GuitarProScoreWriter } from "./guitar-pro-score-writer";
import { GuitarProSerializer } from "./guitar-pro-serializer";
import type { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import { appendChildren, descendants, MElement } from "./m-element";
import type { MNode } from "./m-node";
import { MText } from "./m-text";

// Every published children list is a frozen array: summing the lengths frozen
// while building counts the child references copied, quadratic when wide lists
// are built one append at a time.
const freeze = Object.freeze;
afterEach(() => {
	Object.freeze = freeze;
});
function copiedReferences(
	build: () => unknown,
	counts: (list: unknown[]) => boolean = () => true,
): number {
	let copied = 0;
	Object.freeze = (<T>(value: T): T => {
		if (Array.isArray(value) && counts(value)) {
			copied += value.length;
		}
		return freeze(value);
	}) as typeof Object.freeze;
	try {
		build();
	} finally {
		Object.freeze = freeze;
	}
	return copied;
}

function leaves(count: number): MElement[] {
	return Array.from({ length: count }, () => new MElement("leaf"));
}

function widePart(measures: number, notes: number): string {
	const note =
		"<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>";
	const body = Array.from(
		{ length: measures },
		(_, index) =>
			`<measure number="${index + 1}">${index ? "" : `<attributes><divisions>1</divisions><time><beats>${notes}</beats><beat-type>4</beat-type></time></attributes>`}${note.repeat(notes)}</measure>`,
	).join("");
	return `<score-partwise><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
}

describe("appendChildren", () => {
	it("appends after existing children, in order, publishing one frozen list", () => {
		const root = new MElement("root");
		const first = new MElement("first");
		root.append(first);
		const added = [...leaves(3), new MText("text")];

		appendChildren(root, added);

		expect(root.children).toEqual([first, ...added]);
		expect(Object.isFrozen(root.children)).toBe(true);
		expect(added.every((child) => child.parent === root)).toBe(true);
		expect(() => (root.children as MNode[]).push(new MText("x"))).toThrow();
	});

	it("copies the children list once rather than once per child", () => {
		const root = new MElement("root");
		const added = leaves(1000);

		expect(copiedReferences(() => appendChildren(root, added))).toBe(1000);
	});

	it("moves attached and repeated nodes as appending each would", () => {
		const other = new MElement("other");
		const [moved, kept] = leaves(2) as [MElement, MElement];
		other.append(moved);
		other.append(kept);
		const root = new MElement("root");
		const fresh = new MElement("fresh");

		appendChildren(root, [fresh, moved, fresh]);

		expect(root.children).toEqual([moved, fresh]);
		expect(other.children).toEqual([kept]);
		expect(moved.parent).toBe(root);
	});

	it("rejects a node that would contain itself, changing nothing", () => {
		const top = new MElement("top");
		const inner = new MElement("inner");
		top.append(inner);
		const leaf = new MElement("leaf");

		expect(() => appendChildren(inner, [leaf, top])).toThrow(
			"a node cannot contain itself",
		);
		expect(() => appendChildren(top, [top])).toThrow(
			"a node cannot contain itself",
		);
		expect(inner.children).toEqual([]);
		expect(leaf.parent).toBeNull();
	});

	it("keeps document ownership and history", () => {
		const document = new MDOMParser().parseFromString("<root><kept/></root>");
		const root = document.root;
		const history = document.history;
		const added = leaves(3);
		const grandchild = new MElement("grandchild");
		added[0]!.append(grandchild);

		expect(() => appendChildren(root, added)).toThrow(
			"document mutations require history.edit",
		);
		history.edit("add", () => appendChildren(root, added));
		expect(root.children.slice(1)).toEqual(added);

		expect(history.undo()).toBe(true);
		expect(root.children.map((child) => (child as MElement).tag)).toEqual([
			"kept",
		]);
		expect(added[0]!.parent).toBeNull();
		expect(history.redo()).toBe(true);
		expect(root.children.slice(1)).toEqual(added);
		expect(grandchild.parent).toBe(added[0]!);

		const elsewhere = new MDOMParser().parseFromString("<other><x/></other>");
		const stranger = elsewhere.root.children[0]!;
		stranger.remove();
		expect(() =>
			history.edit("steal", () => appendChildren(root, [stranger])),
		).toThrow("moving nodes between documents");
	});
});

describe("bulk tree construction", () => {
	it("parses a wide part and dense measures copying each child list once", () => {
		const xml = widePart(400, 24);
		let document!: MDocument;
		const copied = copiedReferences(() => {
			document = new MDOMParser().parseFromString(xml);
		});

		const part = document.score.parts[0]!;
		expect(part.measures).toHaveLength(400);
		expect(part.measures[399]!.notes).toHaveLength(24);
		const nodes = descendants(document.root);
		expect(
			nodes.slice(1).every((node) => node.parent?.children.includes(node)),
		).toBe(true);
		// Each node is published once in its parent's list; the parser's own
		// attribute and value freezes stay well under one more per node.
		expect(copied).toBeLessThan(2 * nodes.length);
	});

	it("writes GPIF tables copying each table once", () => {
		const source = new MDOMParser().parseFromString(widePart(200, 8));
		let gpif!: MDocument;
		// Only GPIF lists, whose tags are capitalized: the writer's reads of the
		// source score keep their own caches.
		const gpifList = (list: unknown[]) =>
			list.every((node) => node instanceof MElement && /^[A-Z]/.test(node.tag));
		const copied = copiedReferences(() => {
			gpif = new GuitarProScoreWriter().write(source);
		}, gpifList);

		const notes = gpif.root.child("Notes")!.childrenNamed("Note");
		expect(notes).toHaveLength(1600);
		expect(notes.map((note) => note.getAttribute("id"))).toEqual(
			notes.map((_, index) => String(index)),
		);
		expect(gpif.root.child("MasterBars")!.children).toHaveLength(200);
		const tables = ["Bars", "Voices", "Beats", "Rhythms", "Tracks"].map(
			(name) => gpif.root.child(name)!,
		);
		expect(
			tables.every((table) =>
				table.children.every((entry) => entry.parent === table),
			),
		).toBe(true);
		// One Notes table built note by note alone would copy 1600² / 2.
		expect(copied).toBeLessThan(2 * descendants(gpif.root).length);
	});

	it("round-trips a wide part through Guitar Pro", async () => {
		const source = new MDOMParser().parseFromString(widePart(64, 4));
		const result = await new GuitarProParser().parseFromBytes(
			await new GuitarProSerializer().serializeToBytes(source),
		);

		const measures = result.score.parts[0]!.measures;
		expect(measures).toHaveLength(64);
		expect(measures.every((measure) => measure.notes.length === 4)).toBe(true);
	});
});
