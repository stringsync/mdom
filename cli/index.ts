#!/usr/bin/env bun
// spec(mdom.cli): `mdom` entry point, registered as a bin in package.json
import { Command } from "commander";
import { fix } from "./fix.ts";
import { test } from "./test.ts";
import { release } from "./release.ts";

const program = new Command();

program.name("mdom").description("A DOM for MusicXML.");

// spec(mdom.cli): fix command
program
  .command("fix")
  .description("autofix project issues")
  .action(fix);

// spec(mdom.cli): test command
program
  .command("test")
  .description("run the test suite")
  .action(test);

// spec(mdom.cli): release command
program
  .command("release")
  .description("bump the package version")
  .argument("<type>", "version bump (patch, minor, major)")
  .action(release);

program.parseAsync();
