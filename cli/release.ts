// release validates, bumps the version, builds, commits, tags, and publishes via bun
import chalk from 'chalk';
import { build } from './build.ts';
import { run } from './util.ts';

const TYPES = ['patch', 'minor', 'major'] as const;
type BumpType = (typeof TYPES)[number];

function isBumpType(type: string): type is BumpType {
  return (TYPES as readonly string[]).includes(type);
}

function bump(version: string, type: BumpType): string {
  const parts = version.split('.').map((p) => Number.parseInt(p, 10));
  const [major, minor, patch] = parts;
  if (
    parts.length !== 3 ||
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    parts.some((n) => Number.isNaN(n))
  ) {
    throw new Error(`invalid version in package.json: "${version}"`);
  }
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

// run a command and return its stdout; throw on failure
function capture(command: string, args: string[]): string {
  const result = Bun.spawnSync([command, ...args]);
  if (result.exitCode !== 0) {
    throw new Error(`${command} exited with code ${result.exitCode}`);
  }
  return result.stdout.toString();
}

export async function release(type: string) {
  // unrecognized <type> is rejected with a nonzero exit
  if (!isBumpType(type)) {
    throw new Error(`unknown version bump "${type}" (expected ${TYPES.join(', ')})`);
  }

  // preflight before mutating anything: clean tree, on master, authed to the registry
  if (capture('git', ['status', '--porcelain']).trim()) {
    throw new Error('commit your changes before releasing');
  }
  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  if (branch !== 'master') {
    throw new Error(`must be on master to release (on "${branch}")`);
  }
  // ponytail: bun publish reuses npm's registry auth and bun has no whoami; npm whoami is the only preflight
  if (Bun.spawnSync(['npm', 'whoami'], { stdout: 'ignore', stderr: 'ignore' }).exitCode !== 0) {
    throw new Error('not logged in to npm — run `npm login` before releasing');
  }

  const path = new URL('../package.json', import.meta.url).pathname;
  const pkg = await Bun.file(path).json();
  const current: string = pkg.version ?? '0.0.0';
  const next = bump(current, type);

  const answer = prompt(chalk.yellow(`release ${current} -> ${next} (${type})? (y/n)`));
  if (answer?.trim().toLowerCase() !== 'y') {
    console.log(chalk.red('aborted'));
    return;
  }

  pkg.version = next;
  await Bun.write(path, `${JSON.stringify(pkg, null, 2)}\n`);

  // build before any git mutation so a compile failure aborts the release cleanly
  build();

  run('git', ['commit', '-am', `Release ${next}`]);
  run('git', ['tag', `v${next}`]);
  run('git', ['push', 'origin', `v${next}`]);
  run('bun', ['publish', '--access', 'public']);
  run('git', ['push', 'origin', 'master']);

  console.log(chalk.green(`published ${next}`));
}
