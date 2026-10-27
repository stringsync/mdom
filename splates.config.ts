// splates runs through `bunx @stringsync/splates`, so it is not a dependency here and
// this file cannot import its `ConfigFile` type. That costs key-name checking on the
// object below; splates validates what it reads anyway.
export default {
	// Unset, splates reads the trunk off `refs/remotes/origin/HEAD`, which says
	// master here. Pinned anyway so a clone that never fetched that ref lands on
	// master rather than on splates' `main` fallback.
	trunk: 'master',
	// A fresh worktree has no node_modules, and a rebase can bring in a
	// dependency that the preMerge gate needs installed to run.
	postCheckout: 'bun install',
	postRewrite: 'bun install',
	// A merge can bring the same thing in from trunk, and it deletes the worktree,
	// so the install has to land back in the main tree.
	on: { 'task.done': 'bun install' },
	// The only gate between an agent's work and trunk, so it runs both of the
	// commands AGENTS.md asks for: fix is biome + tsc, test is bun test.
	// --check so the gate reads the tree instead of writing to it.
	preMerge:
		'./bin/mdom fix --check && ./bin/mdom test --reporter=junit --reporter-outfile="$SPLATES_TEST_REPORT"',
	// `splates ship mdom` publishes the public package. `mdom ship` requires a
	// bump type, so the patch bump is explicit.
	ship: './bin/mdom ship patch',
};
