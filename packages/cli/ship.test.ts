import { expect, test } from "bun:test";
import { view } from "core/ship";
import { mdomShip } from "./ship";

test("mdom ships to npm through its mirror, at the bump asked for", () => {
	const plan = view(mdomShip, { bump: "minor" });
	expect(plan.name).toBe("@stringsync/mdom");
	expect(plan.bump).toBe("minor");
	expect(plan.dependencies).toEqual([]);
	expect(plan.steps.map((each) => each.id)).toEqual([
		"test",
		"version",
		"workflow",
		"mirror",
		"login",
		"first-publish",
		"trust",
		"publish",
		"tag",
	]);
});
