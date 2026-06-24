// fix formats, lints, and typechecks the project
import chalk from 'chalk';

export async function fix(opts: { check: boolean }): Promise<void> {
  const failures: string[] = [];

  // biome formats and lints in one pass.
  if (!check(opts.check)) {
    failures.push('check');
  }
  if (!typecheck()) {
    failures.push('typecheck');
  }

  if (failures.length > 0) {
    throw new Error(`fix failed: ${failures.join(', ')}`);
  }
}

function check(checkOnly: boolean): boolean {
  const args = ['biome', 'check', '.'];
  if (!checkOnly) {
    args.push('--write', '--unsafe');
  }
  const ok = exec('bunx', args);
  console.log(`check: ${ok ? chalk.green('success') : chalk.red('failed')}`);
  return ok;
}

function typecheck(): boolean {
  const ok = exec('bunx', ['tsc', '--noEmit']);
  console.log(`typecheck: ${ok ? chalk.green('success') : chalk.red('failed')}`);
  return ok;
}

function exec(command: string, args: string[]): boolean {
  console.log(chalk.cyan(`$ ${[command, ...args].join(' ')}`));
  const result = Bun.spawnSync([command, ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  if (result.signalCode) {
    throw new Error(`${command} terminated with signal ${result.signalCode}`);
  }
  return result.exitCode === 0;
}
