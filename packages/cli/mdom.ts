import { cli, type Deps } from "core/cmd";
import { type Clock, SystemClock } from "core/time";
import { z } from "zod";
import { convert } from "./convert";
import { fix } from "./fix";
import type { ScoreFiles } from "./score-files";
import { publish, ship, trust } from "./ship";
import { test } from "./test";

/** Dependencies supplied when running the mdom command program. */
export interface MdomDeps extends Deps {
	files: ScoreFiles;
	invocationDir: string;
	clock?: Clock;
}

export const mdom = cli<MdomDeps>("mdom");

mdom.use<MdomDeps>(async (ctx, next) => {
	const clock = ctx.clock ?? new SystemClock();
	const start = clock.now();
	await next(ctx);
	ctx.log.info(`done in ${clock.now().subtract(start).human()}`);
});

mdom
	.command("fix")
	.description("format, lint, and typecheck")
	.option("check", z.stringbool(), {
		default: false,
		description: "check without writing fixes",
	})
	.action((opts, { ps, log }) => fix({ ...opts, ps, log }));

mdom
	.command("test")
	.description("run the test suite; forward arguments to bun test")
	.allowUnknownOption()
	.passThroughOptions()
	.rest("args", z.string(), { description: "arguments forwarded to bun test" })
	.action((opts, { ps }) => test({ ...opts, ps }));

mdom
	.command("convert")
	.description(
		"convert between MusicXML (.musicxml/.xml), MXL (.mxl), and Guitar Pro 7/8 (.gp); reads Guitar Pro 3-6 (.gp3/.gp4/.gp5/.gpx)",
	)
	.option("input", z.string(), {
		description: "input score path; extension selects the format",
	})
	.option("output", z.string(), {
		description: "output score path; extension selects the format",
	})
	.option("force", z.stringbool(), {
		default: false,
		description: "replace an existing output file",
	})
	.option("omit-unsupported", z.stringbool(), {
		default: false,
		description: "explicitly omit unsupported Guitar Pro annotations",
	})
	.action((opts, { files, log, invocationDir }) =>
		convert({
			input: opts.input,
			output: opts.output,
			force: opts.force,
			omitUnsupported: opts["omit-unsupported"],
			cwd: invocationDir,
			files,
			log,
		}),
	);

mdom
	.command("ship")
	.description("bump the version, then commit, tag, and publish")
	.arg("type", z.enum(["patch", "minor", "major"] as const))
	.option("dry-run", z.boolean(), {
		default: false,
		description: "rehearse the release, publishing and pushing nothing",
	})
	.action((opts, { ps, log }) =>
		ship(opts.type, { ps, log, dryRun: opts["dry-run"] }),
	);

mdom
	.command("publish")
	.description(
		"build @stringsync/mdom and publish it at this checkout's version: what stringsync/mdom's publish workflow runs, from a job npm trusts",
	)
	.action((_opts, { ps, log }) => publish({ ps, log }));

mdom
	.command("trust")
	.description(
		"have npm trust stringsync/mdom's publish workflow to publish @stringsync/mdom; once, signing in in a browser",
	)
	.action((_opts, { ps, log }) => trust({ ps, log }));
