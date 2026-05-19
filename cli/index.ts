#!/usr/bin/env bun
// spec(mdom.cli): `mdom` entry point, registered as a bin in package.json
import { program } from 'commander';
import { fix } from './fix.ts';
import { test } from './test.ts';
import { release } from './release.ts';
import { spec } from './spec.ts';
import { withErrorHandling, withTiming } from './util.ts';

program.name('mdom').description('A DOM for MusicXML.');

// spec(mdom.cli): fix command
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

// spec(mdom.cli): test command
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

// spec(mdom.cli): release command
program
  .command('release')
  .description('bump the package version')
  .argument('<type>', 'version bump (patch, minor, major)')
  .action(
    withErrorHandling(async (type: string) => {
      await release(type);
    })
  );

// spec(mdom.cli): scan command
program
  .command('scan')
  .description('scan the project specs (via @stringsync/spec)')
  .allowUnknownOption()
  .argument('[args...]', 'arguments forwarded to `@stringsync/spec scan`')
  .action(
    withErrorHandling(
      withTiming(async (args: string[]) => {
        await spec('scan', args);
      })
    )
  );

// spec(mdom.cli): show command
program
  .command('show')
  .description('show a project spec (via @stringsync/spec)')
  .allowUnknownOption()
  .argument('[args...]', 'arguments forwarded to `@stringsync/spec show`')
  .action(
    withErrorHandling(
      withTiming(async (args: string[]) => {
        await spec('show', args);
      })
    )
  );

program.parse();
