// mdom's ship target: @stringsync/mdom goes to npm through its public mirror,
// stringsync/mdom, whose publish workflow npm trusts. `bin/mdom ship` serves it.

import { commitsSince, npm, target } from "core/ship";

// What a release carries: the package, and the core folders its build bundles
// (the subpaths it imports and what they import).
const SHIPPED_PATHS = [
	"mdom/packages/mdom",
	"core/packages/core/disposable",
	"core/packages/core/events",
];

export const mdomShip = target({
	name: "@stringsync/mdom",
	bump: "patch",
	dependencies: [],
	// A release leaves a @stringsync/mdom@<version> tag on the mono commit it
	// was built from; the count starts from the newest.
	unshipped: (ctx) =>
		commitsSince(ctx, {
			release: "@stringsync/mdom",
			paths: SHIPPED_PATHS,
		}),
	plan: ({ bump = "patch" }) =>
		npm.release({
			package: "@stringsync/mdom",
			bump,
			repository: "stringsync/mdom",
			test: "bin/mono test @stringsync/mdom @mdom/cli",
			mirrorTest: "bun test",
		}),
});
