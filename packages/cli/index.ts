#!/usr/bin/env bun
import { NodePs } from 'webappwiz/system';
import { mdom } from './mdom';
import { NodeScoreFiles } from './node-score-files';

const ps = new NodePs();
const invocationDir = ps.cwd();
// Repository commands run from the root; conversion paths belong to the caller.
ps.cd(`${import.meta.dir}/../..`);

await mdom.run({ ps, files: new NodeScoreFiles(), invocationDir });
