import { expect, test } from "bun:test";
import { view } from "core/ship";
import { mdomShip } from "./ship";

test("mdom ships to npm through its mirror, at the bump asked for", () => {
	const plan = view(mdomShip, { bump: "minor" });
	expect(plan.name).toBe("@stringsync/mdom");
	expect(plan.bump).toBe("minor");
	expect(plan.dependencies).toEqual([]);
	expect(plan.steps.map((each) => each.id)).toEqual([
		"login",
		"test",
		"version",
		"workflow",
		"mirror",
		"first-publish",
		"trust",
		"publish",
		"tag",
	]);
});

test("mdom counts unshipped commits since its newest release tag", async () => {
	const commands: string[] = [];
	const count = await mdomShip.unshipped?.({
		sh: async (command: string) => {
			commands.push(command);
			return "2\n";
		},
	});
	expect(count).toBe(2);
	expect(commands[0]).toContain("refs/tags/@stringsync/mdom@*");
	expect(commands[0]).toContain(
		"'mdom/packages/mdom' 'core/packages/core/disposable' 'core/packages/core/events'",
	);
});
