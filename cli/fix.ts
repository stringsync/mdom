// spec(mdom.cli): fix formats, lints, and typechecks the project
import chalk from 'chalk';

export async function fix(opts: { check: boolean }): Promise<void> {
  const failures = new Array<string>();

  // lint with --fix first so the formatter gets the final pass over any
  // autofixes eslint applies (e.g. braces added by the `curly` rule).
  if (!lint(opts.check)) {
    failures.push('lint');
  }
  if (!format(opts.check)) {
    failures.push('format');
  }
  if (!typecheck()) {
    failures.push('typecheck');
  }

  if (failures.length > 0) {
    throw new Error(`fix failed: ${failures.join(', ')}`);
  }
}

function format(check: boolean): boolean {
  const args = ['prettier', '.', '--log-level=warn', check ? '--check' : '--write'];
  const ok = exec('bunx', args);
  console.log(`format: ${ok ? chalk.green('success') : chalk.red('failed')}`);
  return ok;
}

function lint(check: boolean): boolean {
  const args = ['eslint', '.'];
  if (!check) {
    args.push('--fix');
  }
  const ok = exec('bunx', args);
  console.log(`lint: ${ok ? chalk.green('success') : chalk.red('failed')}`);
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
