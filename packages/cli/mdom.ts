import { cli, type Deps, timed } from "core/cmd";
import { serve } from "core/ship";
import type { Clock } from "core/time";
import { z } from "zod";
import { convert } from "./convert";
import { fix } from "./fix";
import { publish, ship, trust } from "./legacy-ship";
import type { ScoreFiles } from "./score-files";
import { mdomShip } from "./ship";
import { test } from "./test";

/** Dependencies supplied when running the mdom command program. */
export interface MdomDeps extends Deps {
	files: ScoreFiles;
	invocationDir: string;
	clock?: Clock;
}

export const mdom = cli<MdomDeps>("mdom");

mdom.use<MdomDeps>((ctx, next) => timed<MdomDeps>(ctx.clock)(ctx, next));

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
	.description(
		"ship @stringsync/mdom to npm: answers splates's plan, done and run, or ships it all at a terminal",
	)
	.rest("args", z.string(), {
		description: "[plan | done <step> | run <step>] [--bump patch|minor|major]",
	})
	.allowUnknownOption()
	.action((opts, { ps }) => {
		// The release's commands run from mono's root, one above mdom's.
		ps.cd(`${ps.cwd()}/..`);
		return serve(mdomShip, opts.args, { ps });
	});

mdom
	.command("legacy-ship")
	.description(
		"the legacy ship: bump the version, then commit, tag, and publish",
	)
	.allowUnknownOption()
	.passThroughOptions()
	.rest("args", z.string())
	.action((opts, { ps, log }) => ship(opts.args, { ps, log }));

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
