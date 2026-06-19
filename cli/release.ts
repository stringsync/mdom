// release bumps the package.json version by semver level
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

export async function release(type: string) {
  // unrecognized <type> is rejected with a nonzero exit
  if (!isBumpType(type)) {
    throw new Error(`unknown version bump "${type}" (expected patch, minor, major)`);
  }

  const path = new URL('../package.json', import.meta.url).pathname;
  const pkg = await Bun.file(path).json();
  const current: string = pkg.version ?? '0.0.0';
  const next = bump(current, type);

  pkg.version = next;
  await Bun.write(path, JSON.stringify(pkg, null, 2) + '\n');

  console.log(`mdom ${current} -> ${next}`);
}
