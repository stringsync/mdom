// ship carries a version out through webappwiz/ship: build, stamp, commit,
// tag, publish to npm, write the GitHub notes. ship owns that flow, including
// the clean-tree and trunk-branch refusals and logging into npm/gh when nobody
// is; what stays here is the part that is mdom's own policy.
import { ConsoleLogger, type Logger } from 'webappwiz/log';
import { type Bump, releases } from 'webappwiz/ship';
import { type Fs, NodePs, type Ps } from 'webappwiz/system';
import { Duration } from 'webappwiz/time';
import { fix } from './fix.ts';

const TYPES = ['patch', 'minor', 'major'] as const;

function isBump(type: string): type is Bump {
	return (TYPES as readonly string[]).includes(type);
}

export interface ShipOptions {
	log?: Logger;
	fs?: Fs;
	ps?: Ps;
	prompt?: (message: string) => string | null;
	yes?: boolean;
}

export async function ship(type: string, opts: ShipOptions = {}) {
	// unrecognized <type> is rejected with a nonzero exit: ship types `bump` but
	// never checks it, and a typo would otherwise ship a silent patch
	if (!isBump(type)) {
		throw new Error(
			`unknown version bump "${type}" (expected ${TYPES.join(', ')})`,
		);
	}

	const log = opts.log ?? new ConsoleLogger();
	const ps = opts.ps ?? new NodePs();

	// `releases.build()` is the compile: its BunBundle turns each public package
	// into a dist/ of JavaScript and declarations and publishes from there, so
	// the source never leaves the repository and no consumer needs a compiler.
	// It runs before anything reaches npm, and clears what it left afterwards.
	await releases
		.lockstep(
			releases.push({ ps }),
			releases.step({
				name: 'Typecheck',
				deadline: Duration.mins(10),
				stage: 'preflight',
				run: async () => fix({ check: true, log, ps }),
			}),
			releases.build(),
			releases.npm('@stringsync/mdom'),
			releases.git(),
			releases.github(),
		)
		.release({
			bump: type,
			prompt: opts.prompt,
			yes: opts.yes,
			log,
			fs: opts.fs,
			ps,
		});
}
