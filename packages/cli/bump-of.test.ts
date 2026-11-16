import { describe, expect, it } from "bun:test";
import { FakePs } from "core/system/testing";
import { ship } from "./legacy-ship";

describe("ship bump input", () => {
	it("requires an explicit bump for a run", async () => {
		expect(ship([], { ps: new FakePs() })).rejects.toThrow(
			"missing version bump",
		);
	});

	it("validates the legacy bump through the wrapper", async () => {
		const ps = new FakePs();
		ps.setEnv({ SPLATES_SHIP_BUMP: "huge" });
		expect(ship([], { ps })).rejects.toThrow("invalid ship input bump");
	});

	it("validates named bump inputs before release work", async () => {
		const ps = new FakePs();
		expect(ship(["run", "--input", "bump=huge"], { ps })).rejects.toThrow(
			"invalid ship input bump",
		);
		expect(ps.getCalls()).toEqual([]);
	});
});
