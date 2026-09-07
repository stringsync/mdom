// build compiles the library into dist/: bundled ESM via bun, .d.ts via tsc
import chalk from 'chalk';
import { run } from './util.ts';

export function build(): void {
  run('rm', ['-rf', 'dist']);
  // bundle our own source into one ESM module; keep npm deps external for the consumer to install
  run('bun', [
    'build',
    './index.ts',
    '--outdir',
    'dist',
    '--target',
    'node',
    '--format',
    'esm',
    '--packages',
    'external',
  ]);
  // tsc is the only reliable .d.ts emitter
  run('bunx', ['tsc', '-p', 'tsconfig.build.json']);
  console.log(chalk.green('built dist/'));
}
