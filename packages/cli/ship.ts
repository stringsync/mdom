// mdom's ship target: @stringsync/mdom goes to npm through its public mirror,
// stringsync/mdom, whose publish workflow npm trusts. `bin/mdom ship` serves it.

import { npm, target } from "core/ship";

export const mdomShip = target({
	name: "@stringsync/mdom",
	bump: "patch",
	dependencies: [],
	plan: ({ bump = "patch" }) =>
		npm.release({
			package: "@stringsync/mdom",
			bump,
			repository: "stringsync/mdom",
			test: "bin/mono test @stringsync/mdom @mdom/cli",
		}),
});
