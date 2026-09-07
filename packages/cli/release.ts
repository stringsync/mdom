// release carries a version out through webappwiz/ship: stamp, commit, tag,
// publish to npm, write the GitHub notes. ship owns that flow, including the
// clean-tree and trunk-branch refusals and logging into npm/gh when nobody is;
// what stays here is the part that is mdom's own policy.
import { type Bump, releases } from 'webappwiz/ship';
import { build } from './build.ts';
import { fix } from './fix.ts';

const TYPES = ['patch', 'minor', 'major'] as const;

function isBump(type: string): type is Bump {
  return (TYPES as readonly string[]).includes(type);
}

export async function release(type: string) {
  // unrecognized <type> is rejected with a nonzero exit: ship types `bump` but
  // never checks it, and a typo would otherwise ship a silent patch
  if (!isBump(type)) {
    throw new Error(`unknown version bump "${type}" (expected ${TYPES.join(', ')})`);
  }

  // the gates ship has no opinion about, run before it stamps anything: a
  // failure here costs nothing, one after the tag is pushed costs a version.
  // ponytail: built up front rather than as a `releases.build` bundle, so the
  // confirm prompt comes after the wait; wire the Bundle in if that grates
  await fix({ check: true });
  build();

  // dist/ is what ships (`files`), published from the package root, so nothing
  // here stages a directory: npm, then the tag, then the notes about it
  await releases.lockstep(releases.npm('@stringsync/mdom'), releases.git(), releases.github()).release({ bump: type });
}
