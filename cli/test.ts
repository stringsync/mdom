// spec(mdom.cli): test runs `bun test`, forwarding its exit code
export async function test() {
  const proc = Bun.spawn(["bun", "test"], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  const code = await proc.exited;
  process.exit(code);
}
