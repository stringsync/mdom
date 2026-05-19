// spec(mdom.cli): test runs `bun test`, forwarding extra args and its exit code
export async function test(args: string[] = []) {
  const proc = Bun.spawn(['bun', 'test', ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  const code = await proc.exited;
  process.exit(code);
}
