// ship carries a version out through webappwiz/ship: build, stamp, commit,
// tag, publish to npm, write the GitHub notes. ship owns that flow, including
// the clean-tree and trunk-branch refusals and logging into npm/gh when nobody
// is; what stays here is the part that is mdom's own policy.
import { type Bump, releases } from 'webappwiz/ship';
import { fix } from './fix.ts';

const TYPES = ['patch', 'minor', 'major'] as const;

function isBump(type: string): type is Bump {
	return (TYPES as readonly string[]).includes(type);
}

export async function ship(type: string) {
	// unrecognized <type> is rejected with a nonzero exit: ship types `bump` but
	// never checks it, and a typo would otherwise ship a silent patch
	if (!isBump(type)) {
		throw new Error(
			`unknown version bump "${type}" (expected ${TYPES.join(', ')})`,
		);
	}

	// the one gate ship has no opinion about, run before it stamps anything: a
	// failure here costs nothing, one after the tag is pushed costs a version
	await fix({ check: true });

	// `releases.build()` is the compile: its BunBundle turns each public package
	// into a dist/ of JavaScript and declarations and publishes from there, so
	// the source never leaves the repository and no consumer needs a compiler.
	// It runs before anything reaches npm, and clears what it left afterwards.
	await releases
		.lockstep(
			releases.build(),
			releases.npm('@stringsync/mdom'),
			releases.git(),
			releases.github(),
		)
		.release({ bump: type });
}
