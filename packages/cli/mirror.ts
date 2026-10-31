import type { MirrorOptions } from "core/ship";

/** Where and how mdom is mirrored to its public repository. */
export const MIRROR = {
	project: "mdom",
	remote: "https://github.com/stringsync/mdom.git",
	branch: "master",
	// The standalone repository's last commit, which mono's mdom was copied from.
	adopt: "20b8ce43aeabbea98a912566d689444a85471b6a",
	// Releases are tagged on the public repository, where the notes go too.
	tag: true,
	// vet and scry never leave mono, nor do the rules and skills for them
	config: {
		exclude: [
			"**/.vet/**",
			"**/vet.config.ts",
			"**/.scry/**",
			"**/scry.config.ts",
			"**/.claude/**",
			"**/.agents/**",
		],
	},
} satisfies MirrorOptions;
