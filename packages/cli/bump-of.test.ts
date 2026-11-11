import { describe, expect, it } from "bun:test";
import { FakePs } from "core/system/testing";
import { bumpOf } from "./ship";

describe("bumpOf", () => {
	it("takes the argument over SPLATES_SHIP_BUMP", () => {
		const ps = new FakePs();
		ps.setEnv({ SPLATES_SHIP_BUMP: "major" });
		expect(bumpOf("minor", ps)).toBe("minor");
	});

	it("reads SPLATES_SHIP_BUMP without an argument", () => {
		const ps = new FakePs();
		ps.setEnv({ SPLATES_SHIP_BUMP: "minor" });
		expect(bumpOf(undefined, ps)).toBe("minor");
	});

	it("refuses an unknown SPLATES_SHIP_BUMP", () => {
		const ps = new FakePs();
		ps.setEnv({ SPLATES_SHIP_BUMP: "huge" });
		expect(() => bumpOf(undefined, ps)).toThrow('unknown version bump "huge"');
	});

	it("refuses neither", () => {
		expect(() => bumpOf(undefined, new FakePs())).toThrow(
			"missing version bump",
		);
	});
});
