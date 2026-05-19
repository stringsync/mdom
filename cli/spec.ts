// spec(mdom.cli): scan and show forward to `@stringsync/spec`, passing args and its exit code
export async function spec(subcommand: 'scan' | 'show', args: string[] = []) {
  const proc = Bun.spawn(['bunx', '-y', '@stringsync/spec', subcommand, ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  const code = await proc.exited;
  process.exit(code);
}
