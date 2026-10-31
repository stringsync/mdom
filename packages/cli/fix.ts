import { join } from "node:path";
import { ConsoleLogger, color, type Logger } from "core/log";
import { NodePs, type Ps } from "core/system";

/** The packages under packages/, each typechecked on its own. */
const PACKAGES = ["cli", "e2e", "mdom"];

export interface FixOptions {
	check: boolean;
	log?: Logger;
	ps?: Ps;
}

/** Formats, lints and typechecks the repository; throws if either check fails. */
export async function fix(opts: FixOptions): Promise<void> {
	const log = opts.log ?? new ConsoleLogger();
	const ps = opts.ps ?? new NodePs();
	const failures: string[] = [];
	const args = ["bunx", "biome", "check", "."];
	if (!opts.check) {
		args.push("--write", "--unsafe");
	}
	log.info(`$ ${args.join(" ")}`);
	const check = await ps.spawn(args);
	log.info(
		`check: ${check.exitCode === 0 ? color.green("success") : color.red("failed")}`,
	);
	if (check.exitCode !== 0) {
		failures.push("check");
	}
	// One program per package, each with its own lib and types, found from here
	// so it works in mono and in the mirror alike.
	let typed = true;
	for (const pkg of PACKAGES) {
		const project = join(import.meta.dir, "..", pkg, "tsconfig.json");
		log.info(`$ bunx tsc --noEmit -p ${project}`);
		const types = await ps.spawn(["bunx", "tsc", "--noEmit", "-p", project]);
		typed &&= types.exitCode === 0;
	}
	log.info(
		`typecheck: ${typed ? color.green("success") : color.red("failed")}`,
	);
	if (!typed) {
		failures.push("typecheck");
	}
	if (failures.length > 0) {
		throw new Error(`fix failed: ${failures.join(", ")}`);
	}
}
