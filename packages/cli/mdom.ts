import { cli, type Deps, timed } from "core/cmd";
import { serve } from "core/ship";
import type { Clock } from "core/time";
import { z } from "zod";
import { convert } from "./convert";
import { fix } from "./fix";
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
