import { describe, expect, it } from "bun:test";
import { MElement } from "./m-element";
import { Branch } from "./m-node-branch.fixture";
import { Leaf } from "./m-node-leaf.fixture";
import { MText } from "./m-text";

class Root extends MElement {
	constructor() {
		super("root");
	}
}

describe("MNode / MElement", () => {
	it("sets parent on append and detaches from an old parent", () => {
		const root = new Root();
		const root2 = new Root();
		const child = new Leaf();

		root.append(child);
		expect(child.parent).toBe(root);
		expect(root.children).toEqual([child]);

		root2.append(child);
		expect(child.parent).toBe(root2);
		expect(root.children).toEqual([]);
		expect(root2.children).toEqual([child]);
	});

	it("removes a node via MNode.remove()", () => {
		const root = new Root();
		const child = new Leaf();
		root.append(child);

		child.remove();

		expect(child.parent).toBeNull();
		expect(root.children).toEqual([]);
	});

	it("removes a child via removeChild()", () => {
		const root = new Root();
		const child = new Leaf();
		root.append(child);

		root.removeChild(child);

		expect(child.parent).toBeNull();
		expect(root.children).toEqual([]);
	});

	it("reads and writes attributes", () => {
		const element = new Root();
		element.setAttribute("id", "P1");

		expect(element.getAttribute("id")).toBe("P1");
		expect(element.getAttribute("missing")).toBeNull();
	});

	it("returns a defensive copy for attributes", () => {
		const element = new Root();
		element.setAttribute("id", "P1");

		const attrs = element.attributes;
		attrs.id = "CHANGED";

		expect(element.getAttribute("id")).toBe("P1");
	});

	it("returns the first text node value and null when there is no text node", () => {
		const element = new Root();
		element.append(new MText("first"));
		element.append(new MText("second"));

		expect(element.text).toBe("first");

		const empty = new Root();
		expect(empty.text).toBeNull();
	});

	it("finds ancestors with closest(), including self", () => {
		const root = new Root();
		const branch = new Branch();
		const leaf = new Leaf();

		root.append(branch);
		branch.append(leaf);

		expect(leaf.closest(Branch)).toBe(branch);
		expect(leaf.closest(Root)).toBe(root);
		expect(branch.closest(Branch)).toBe(branch);
		expect(root.closest(Leaf)).toBeNull();
	});

	it("filters direct children by type with childrenOfType()", () => {
		const root = new Root();
		const branch = new Branch();
		const leaf = new Leaf();

		root.append(branch);
		root.append(leaf);
		root.append(new MText("text"));

		expect(root.childrenOfType(Branch)).toEqual([branch]);
		expect(root.childrenOfType(Leaf)).toEqual([leaf]);
	});

	it("finds the first matching element by tag with child()", () => {
		const root = new Root();
		const first = new Leaf();
		const second = new Leaf();

		root.append(new MText("hello"));
		root.append(first);
		root.append(second);

		expect(root.child("leaf")).toBe(first);
		expect(root.child("branch")).toBeNull();
	});
});
