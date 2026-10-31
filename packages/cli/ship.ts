// ship carries a version out through core/ship: build, stamp, commit,
// tag, publish to npm, write the GitHub notes. ship owns that flow, including
// the clean-tree and trunk-branch refusals and logging into npm/gh when nobody
// is; what stays here is the part that is mdom's own policy.
import { ConsoleLogger, type Logger } from "core/log";
import {
	type Bump,
	type DryRun,
	type GithubActions,
	githubActions,
	releases,
} from "core/ship";
import { type Fs, NodePs, type Ps } from "core/system";
import { Duration } from "core/time";
import { fix } from "./fix.ts";
import { MIRROR } from "./mirror.ts";

export interface ShipOptions {
	log?: Logger;
	fs?: Fs;
	ps?: Ps;
	prompt?: (message: string) => string | null;
	yes?: boolean;
	/** Rehearse the release, sending nothing out; see core/ship's `dryRun`. */
	dryRun?: boolean | DryRun;
}

/** The repository mdom is mirrored to, whose workflow publishes it. */
const REPO = "stringsync/mdom";

/** What stringsync/mdom's publish workflow runs, from the mirror's root. */
const PUBLISH = "bin/mdom publish";

const PACKAGE = "@stringsync/mdom";

export async function ship(type: string, opts: ShipOptions = {}) {
	// unrecognized <type> is rejected with a nonzero exit: ship types `bump` but
	// never checks it, and a typo would otherwise ship a silent patch
	if (!isBump(type)) {
		throw new Error(
			`unknown version bump "${type}" (expected ${TYPES.join(", ")})`,
		);
	}

	const log = opts.log ?? new ConsoleLogger();
	const ps = opts.ps ?? new NodePs();
	const via = actions(ps);

	// `releases.mirrored()` is the compile, done where anyone cloning the public
	// repository would do it: it writes the mirror's commit, installs it from
	// npm, and its VendorBundle turns @stringsync/mdom into a dist/ of
	// JavaScript and declarations, with the core it reaches folded in, which is
	// what npm gets. It runs before anything reaches npm, and pushes that commit
	// at the tag stage. The tag and the notes go on the public repository; mono,
	// which holds every project, gets no tag, and the release commit goes up
	// with mono's next push.
	await releases
		.lockstep(
			releases.push({ ps }),
			releases.step({
				name: "Typecheck",
				deadline: Duration.mins(10),
				stage: "preflight",
				run: async () => fix({ check: true, log, ps }),
			}),
			// npm gets the build stringsync/mdom's publish workflow makes from the
			// mirror's commit, which npm trusts, so nothing logs in or approves.
			releases.mirrored({ ...MIRROR, ps, publish: PUBLISH, via }),
			releases.npm(PACKAGE, { ps, via }),
			releases.github({ repo: REPO, ps }),
		)
		.release({
			bump: type,
			project: "mdom",
			prompt: opts.prompt,
			yes: opts.yes,
			dryRun: opts.dryRun,
			log,
			fs: opts.fs,
			ps,
		});
}

const TYPES = ["patch", "minor", "major"] as const;

function isBump(type: string): type is Bump {
	return (TYPES as readonly string[]).includes(type);
}

export interface PublishOptions {
	log?: Logger;
	fs?: Fs;
	ps?: Ps;
}

/**
 * Builds @stringsync/mdom and publishes it at the version the checkout stands
 * at, unless npm has it already. stringsync/mdom's publish workflow runs it
 * from a release's mirror commit, as a job npm trusts; it is never run in mono.
 */
export async function publish(opts: PublishOptions = {}): Promise<void> {
	const ps = opts.ps ?? new NodePs();
	await releases
		.lockstep(releases.vendor(), releases.npm(PACKAGE, { ps }))
		.publish({ log: opts.log, fs: opts.fs, ps });
}

/**
 * Has npm trust stringsync/mdom's publish workflow to publish
 * @stringsync/mdom. Run once, by the person: npm asks to sign in in a browser.
 */
export async function trust(opts: PublishOptions = {}): Promise<void> {
	const ps = opts.ps ?? new NodePs();
	await releases
		.npm(PACKAGE, { ps, via: actions(ps) })
		.trust({ log: opts.log });
}

function actions(ps: Ps): GithubActions {
	return githubActions({ repo: REPO, ps, trustCommand: "bin/mdom trust" });
}
