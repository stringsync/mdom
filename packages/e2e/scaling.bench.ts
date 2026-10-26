import { GuitarProParser, MDOMParser } from '@stringsync/mdom';
import { cli } from 'webappwiz/cmd';
import { NodeFs, NodePs } from 'webappwiz/system';
import { z } from 'zod';
import {
	measureOperation,
	type Operation,
	operations,
} from './scaling-operations';
import { type CaseResult, formatTable, summarize } from './scaling-report';
import {
	type Axis,
	repeatScore,
	scoreCounts,
	syntheticScore,
} from './scaling-score';

const positiveInteger = z.coerce.number().int().positive().max(1_000_000);
const program = cli('scaling-bench').fallback('run');
program
	.command('run')
	.description(
		'Fixture-based doubling benchmark. Defaults to 100,200,400,800 measures; full runs are expensive.',
	)
	.option('operation', z.enum(['all', ...operations] as const), {
		default: 'all',
	})
	.option('axis', z.enum(['measures', 'parts', 'voices', 'notes']), {
		default: 'measures',
	})
	.option('size', positiveInteger.optional(), {
		description:
			'Run exactly one size (also runs in-process for profiling with one operation)',
	})
	.option('base', positiveInteger, { default: 100 })
	.option('steps', positiveInteger.max(10), { default: 4 })
	.option('measures', positiveInteger, { default: 100 })
	.option('parts', positiveInteger, { default: 1 })
	.option('voices', positiveInteger, { default: 1 })
	.option('notes', positiveInteger, {
		default: 4,
		description: 'Notes per voice per measure in synthetic cases',
	})
	.option('synthetic', z.boolean(), { default: false })
	.option('edits', z.coerce.number().int().nonnegative(), {
		default: 0,
		description:
			'0 = one edit per note; removals cap at the initial note count',
	})
	.option('samples', positiveInteger.max(100), { default: 3 })
	.option('seed', z.string(), {
		default: `${import.meta.dir}/examples/lilypond/21d-Chords-SchubertStabatMater.xml`,
	})
	.option('gp-seed', z.string(), {
		default: `${import.meta.dir}/../mdom/fixtures/guitar-pro/notes.gp`,
	})
	.option('json', z.string().optional())
	.option('sample', z.boolean(), {
		default: false,
		description: 'Internal: emit one raw case as JSON',
	})
	.action(async (options, { log, ps: processes }) => {
		const files = new NodeFs();
		const selectedOperations: readonly Operation[] = operations.filter(
			(operation) =>
				options.operation === 'all' || operation === options.operation,
		);
		const sizes = options.size
			? [options.size]
			: Array.from(
					{ length: options.steps },
					(_unusedValue, stepIndex) => options.base * 2 ** stepIndex,
				);
		if (sizes.some((size) => !Number.isSafeInteger(size) || size > 1_000_000)) {
			throw new Error(
				'Generated sizes must be safe positive integers at most 1000000',
			);
		}
		if (
			options.sample &&
			(selectedOperations.length !== 1 || sizes.length !== 1)
		) {
			throw new Error('--sample requires one --operation and --size');
		}
		const results: CaseResult[] = [];
		const inProcess = selectedOperations.length === 1 && sizes.length === 1;
		for (const operation of selectedOperations) {
			for (const size of sizes) {
				const result: CaseResult = { operation, size, samples: [] };
				try {
					for (
						let sampleIndex = 0;
						sampleIndex < (options.sample ? 1 : options.samples);
						sampleIndex++
					) {
						if (!inProcess) {
							const args = [
								'bun',
								import.meta.path,
								'--operation',
								operation,
								'--size',
								String(size),
								'--axis',
								options.axis,
								'--measures',
								String(options.measures),
								'--parts',
								String(options.parts),
								'--voices',
								String(options.voices),
								'--notes',
								String(options.notes),
								'--edits',
								String(options.edits),
								'--seed',
								options.seed,
								'--gp-seed',
								options['gp-seed'],
								'--sample',
							];
							if (options.synthetic) {
								args.push('--synthetic');
							}
							const child = await processes.spawnCapture(args);
							if (child.exitCode !== 0) {
								throw new Error(
									child.stderr ||
										child.stdout ||
										`Child exited ${child.exitCode}`,
								);
							}
							const childResult = JSON.parse(child.stdout) as CaseResult;
							if (childResult.error) {
								throw new Error(childResult.error);
							}
							result.counts = childResult.counts;
							result.samples.push(...childResult.samples);
						} else {
							// GP operations use a real GP import, repeated in MusicXML then
							// re-exported untimed. Other operations share the real XML seed.
							const seed =
								operation === 'gp-parse' || operation === 'serialize-gp'
									? await new GuitarProParser().parseFromBytes(
											await files.readBytes(options['gp-seed']),
										)
									: new MDOMParser().parseFromString(
											await files.read(options.seed),
										);
							const shape = {
								measures: options.measures,
								parts: options.parts,
								voices: options.voices,
								notes: options.notes,
								[options.axis]: size,
							};
							const xml =
								options.synthetic || options.axis !== 'measures'
									? syntheticScore(seed, shape)
									: repeatScore(seed, size);
							result.counts = scoreCounts(xml);
							result.samples.push(
								await measureOperation(operation, xml, options.edits),
							);
						}
					}
				} catch (error) {
					result.error = error instanceof Error ? error.message : String(error);
				}
				results.push(result);
				if (!options.sample) {
					log.info(
						`${operation} size=${size}: ${result.error ? `ERROR ${result.error}` : `${result.samples.length} sample(s)`}`,
					);
				}
			}
		}
		if (options.sample) {
			console.log(JSON.stringify(results[0]));
			return;
		}
		const summary = summarize(results, options.axis as Axis);
		console.log(formatTable(summary));
		if (options.json) {
			await files.write(
				options.json,
				`${JSON.stringify({ schemaVersion: 1, runtime: { bun: Bun.version, platform: processes.platform }, options, isolation: inProcess ? 'in-process samples' : 'fresh process per sample', results, summary }, null, 2)}\n`,
			);
		}
		if (results.some((result) => result.error)) {
			processes.exit(1);
		}
	});

await program.run({ ps: new NodePs() });
