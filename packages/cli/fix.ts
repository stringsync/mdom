import { ConsoleLogger, color, type Logger } from 'webappwiz/log';
import { NodePs, type Ps } from 'webappwiz/system';

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
	const args = ['bunx', 'biome', 'check', '.'];
	if (!opts.check) {
		args.push('--write', '--unsafe');
	}
	log.info(`$ ${args.join(' ')}`);
	const check = await ps.spawn(args);
	log.info(
		`check: ${check.exitCode === 0 ? color.green('success') : color.red('failed')}`,
	);
	if (check.exitCode !== 0) {
		failures.push('check');
	}
	log.info('$ bunx tsc --noEmit');
	const types = await ps.spawn(['bunx', 'tsc', '--noEmit']);
	log.info(
		`typecheck: ${types.exitCode === 0 ? color.green('success') : color.red('failed')}`,
	);
	if (types.exitCode !== 0) {
		failures.push('typecheck');
	}
	if (failures.length > 0) {
		throw new Error(`fix failed: ${failures.join(', ')}`);
	}
}
