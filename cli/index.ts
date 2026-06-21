#!/usr/bin/env bun
// `mdom` entry point, registered as a bin in package.json
import { program } from 'commander';
import { fix } from './fix.ts';
import { test } from './test.ts';
import { build } from './build.ts';
import { release } from './release.ts';
import { withErrorHandling, withTiming } from './util.ts';

program.name('mdom').description('A DOM for MusicXML.');

// build command
program
  .command('build')
  .description('compile the library to dist/ (bundled JS + .d.ts)')
  .action(
    withErrorHandling(
      withTiming(async () => {
        build();
      })
    )
  );

// fix command
program
  .command('fix')
  .description('format, lint, and typecheck')
  .option('--check', 'check without fixing issues', false)
  .action(
    withErrorHandling(
      withTiming(async (opts: { check: boolean }) => {
        await fix({ check: opts.check });
      })
    )
  );

// test command
program
  .command('test')
  .description('run the test suite')
  .allowUnknownOption()
  .argument('[args...]', 'arguments forwarded to `bun test`')
  .action(
    withErrorHandling(
      withTiming(async (args: string[]) => {
        await test(args);
      })
    )
  );

// release command
program
  .command('release')
  .description('bump the version, then commit, tag, and publish')
  .argument('<type>', 'version bump (patch, minor, major)')
  .action(
    withErrorHandling(async (type: string) => {
      await release(type);
    })
  );

program.parse();
