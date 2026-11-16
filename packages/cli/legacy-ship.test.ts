import { beforeEach, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { MemoryLogger } from "core/log";
import { FakeFs, FakePs } from "core/system/testing";
import { ship } from "./legacy-ship";

const GATE = [
	"bunx biome check .",
	...["cli", "e2e", "mdom"].map(
		(pkg) =>
			`bunx tsc --noEmit -p ${join(import.meta.dir, "..", pkg, "tsconfig.json")}`,
	),
];
const PUSH = "git -C /repo push origin main";

describe("ship", () => {
	let fs: FakeFs;
	let log: MemoryLogger;
	let ps: FakePs;

	beforeEach(async () => {
		fs = new FakeFs();
		log = new MemoryLogger();
		ps = new FakePs();
		ps.setCwd("/repo");
		await fs.write(
			"/repo/package.json",
			JSON.stringify({
				name: "@stringsync/mdom",
				version: "1.2.3",
				// What npm checks a publish from stringsync/mdom's workflow against.
				repository: { url: "git+https://github.com/stringsync/mdom.git" },
			}),
		);
		const spawnCapture = ps.spawnCapture.bind(ps);
		ps.spawnCapture = async (argv, opts) => {
			const result = await spawnCapture(argv, opts);
			const command = argv.join(" ");
			if (command.endsWith("rev-parse --abbrev-ref HEAD")) {
				return { ...result, stdout: "main\n" };
			}
			if (command.endsWith("symbolic-ref --short refs/remotes/origin/HEAD")) {
				return { ...result, stdout: "origin/main\n" };
			}
			return result;
		};
	});

	const opts = () => ({ fs, log, ps, prompt: () => "n" });

	it("prints a plan with typed bump choices without running release steps", async () => {
		let output = "";
		await ship(["plan", "--json", "--input", "bump=minor"], {
			...opts(),
			output: {
				write: (text) => {
					output += text;
				},
			},
		});
		const plan = JSON.parse(output);
		expect(plan.identity).toEqual({
			kind: "version",
			from: "1.2.3",
			to: "1.3.0",
		});
		expect(plan.inputs[0]).toMatchObject({
			name: "bump",
			options: ["patch", "minor", "major"],
		});
		expect(ps.getCalls()).not.toContain(PUSH);
		expect(JSON.parse(await fs.read("/repo/package.json")).version).toBe(
			"1.2.3",
		);
	});

	it("takes a CLI bump over named and legacy environment inputs", async () => {
		ps.setEnv({
			SPLATES_SHIP_BUMP: "major",
			SPLATES_SHIP_INPUTS: '{"bump":"minor"}',
		});
		let output = "";
		await ship(["plan", "--input=bump=patch"], {
			...opts(),
			output: {
				write: (text) => {
					output += text;
				},
			},
		});
		expect(JSON.parse(output).identity.to).toBe("1.2.4");
	});

	it("accepts the named environment bump for a run", async () => {
		ps.setEnv({ SPLATES_SHIP_INPUTS: '{"bump":"minor"}' });
		await ship(["run"], opts());
		expect(ps.getCalls()).toContain(PUSH);
	});

	it("prints status without running release steps", async () => {
		let output = "";
		await ship(["status", "--json"], {
			...opts(),
			output: {
				write: (text) => {
					output += text;
				},
			},
		});
		expect(JSON.parse(output).identity).toEqual({
			kind: "version",
			from: "1.2.3",
			to: "1.2.3",
		});
		expect(ps.getCalls()).not.toContain(PUSH);
	});

	it("pushes before the checks and leaves the release unstamped when declined", async () => {
		await ship(["patch"], opts());

		const calls = ps.getCalls();
		const push = calls.indexOf(PUSH);
		expect(calls.slice(0, push)).toEqual([
			"git -C /repo rev-parse --abbrev-ref HEAD",
			"git -C /repo symbolic-ref --short refs/remotes/origin/HEAD",
			"git -C /repo status --porcelain",
			"git -C /repo rev-parse --abbrev-ref HEAD",
		]);
		expect(calls.slice(push + 1, push + 1 + GATE.length)).toEqual(GATE);
		expect(calls).not.toContain("npm publish --access public");
		expect(JSON.parse(await fs.read("/repo/package.json")).version).toBe(
			"1.2.3",
		);
	});

	it("stops before checks and release work when the push is rejected", async () => {
		ps.simulate(async () => (ps.getCalls().at(-1) === PUSH ? 1 : 0));

		expect(ship(["patch"], opts())).rejects.toThrow("git push origin main");

		expect(ps.getCalls().at(-1)).toBe(PUSH);
		expect(JSON.parse(await fs.read("/repo/package.json")).version).toBe(
			"1.2.3",
		);
		expect(await fs.exists("/repo/RELEASE")).toBe(false);
	});
});
