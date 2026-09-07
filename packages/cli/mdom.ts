import { cli, type Deps } from 'webappwiz/cmd';
import { t } from 'webappwiz/t';
import { type Clock, SystemClock } from 'webappwiz/time';
import { convert } from './convert';
import { fix } from './fix';
import type { ScoreFiles } from './score-files';
import { ship } from './ship';
import { test } from './test';

/** Dependencies supplied when running the mdom command program. */
export interface MdomDeps extends Deps {
	files: ScoreFiles;
	invocationDir: string;
	clock?: Clock;
}

export const mdom = cli<MdomDeps>('mdom');

mdom.use<MdomDeps>(async (ctx, next) => {
	const clock = ctx.clock ?? new SystemClock();
	const start = clock.now();
	await next(ctx);
	ctx.log.info(`done in ${clock.now().subtract(start).human()}`);
});

mdom
	.command('fix')
	.description('format, lint, and typecheck')
	.option('check', t.boolean(), {
		default: false,
		description: 'check without writing fixes',
	})
	.action((opts, { ps, log }) => fix({ ...opts, ps, log }));

mdom
	.command('test')
	.description('run the test suite; forward arguments to bun test')
	.allowUnknownOption()
	.passThroughOptions()
	.rest('args', t.string(), { description: 'arguments forwarded to bun test' })
	.action((opts, { ps }) => test({ ...opts, ps }));

mdom
	.command('convert')
	.description(
		'convert between MusicXML (.musicxml/.xml), MXL (.mxl), and Guitar Pro 7/8 (.gp)',
	)
	.option('input', t.string(), {
		description: 'input score path; extension selects the format',
	})
	.option('output', t.string(), {
		description: 'output score path; extension selects the format',
	})
	.option('force', t.boolean(), {
		default: false,
		description: 'replace an existing output file',
	})
	.option('omit-unsupported', t.boolean(), {
		default: false,
		description: 'explicitly omit unsupported Guitar Pro annotations',
	})
	.action((opts, { files, log, invocationDir }) =>
		convert({
			input: opts.input,
			output: opts.output,
			force: opts.force,
			omitUnsupported: opts['omit-unsupported'],
			cwd: invocationDir,
			files,
			log,
		}),
	);

mdom
	.command('ship')
	.description('bump the version, then commit, tag, and publish')
	.arg('type', t.enum(['patch', 'minor', 'major'] as const))
	.action((opts) => ship(opts.type));
