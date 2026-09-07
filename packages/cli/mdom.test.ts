import { beforeEach, describe, expect, it } from 'bun:test';
import { GuitarProParser, MDOMParser } from '@stringsync/mdom';
import { color, MemoryLogger } from 'webappwiz/log';
import { FakePs } from 'webappwiz/system/testing';
import { FakeScoreFiles } from './fake-score-files';
import { type MdomDeps, mdom } from './mdom';

describe('mdom command program', () => {
	let deps: MdomDeps;
	let files: FakeScoreFiles;
	let log: MemoryLogger;
	let ps: FakePs;

	beforeEach(() => {
		files = new FakeScoreFiles();
		log = new MemoryLogger();
		ps = new FakePs();
		ps.setCwd('/repository');
		deps = { files, log, ps, invocationDir: '/scores' };
	});

	it('exports an inert program that runs help with supplied dependencies', async () => {
		await mdom.run(deps, ['--help']);

		expect(
			log.entries.map((entry) => color.strip(String(entry.message))).join('\n'),
		).toContain('convert');
		expect(ps.getCalls()).toEqual([]);
		expect(files.contents.size).toBe(0);
	});

	it('requires both conversion paths', async () => {
		await mdom.run(deps, ['convert', '--input', 'song.gp']);

		expect(ps.getExitCode()).toBe(1);
		expect(log.entries).toContainEqual(
			expect.objectContaining({
				level: 'error',
				message: expect.stringContaining('output'),
			}),
		);
		expect(files.contents.size).toBe(0);
	});

	it('rejects unknown conversion flags', async () => {
		await mdom.run(deps, [
			'convert',
			'--input',
			'song.gp',
			'--output',
			'song.xml',
			'--overwrite',
		]);

		expect(ps.getExitCode()).toBe(1);
		expect(log.entries).toContainEqual(
			expect.objectContaining({
				level: 'error',
				message: expect.stringContaining('overwrite'),
			}),
		);
	});

	it('dispatches a conversion using the invocation directory', async () => {
		files.contents.set(
			'/scores/source.gp',
			new Uint8Array(
				await Bun.file(
					new URL('../mdom/fixtures/guitar-pro/strings.gp', import.meta.url),
				).arrayBuffer(),
			),
		);
		await mdom.run(deps, [
			'convert',
			'--input',
			'source.gp',
			'--output',
			'result.musicxml',
		]);
		const document = new MDOMParser().parseFromString(
			new TextDecoder().decode(await files.read('/scores/result.musicxml')),
		);

		expect(document.score.parts[0]!.measures[0]!.notes[0]!.fret).toBe(1);
		expect(files.contents.has('/repository/result.musicxml')).toBe(false);
		expect(ps.getExitCode()).toBe(0);
	});

	it('forwards force and annotation omission to the converter', async () => {
		files.contents.set(
			'/scores/source.musicxml',
			new TextEncoder().encode(`<score-partwise><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
			<part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><lyric><text>la</text></lyric></note>
			</measure></part></score-partwise>`),
		);
		files.contents.set('/scores/result.gp', new Uint8Array([1]));
		await mdom.run(deps, [
			'convert',
			'--input',
			'source.musicxml',
			'--output',
			'result.gp',
			'--force',
			'--omit-unsupported',
		]);
		const document = await new GuitarProParser().parseFromBytes(
			await files.read('/scores/result.gp'),
		);

		expect(document.score.parts[0]!.measures[0]!.notes[0]!.pitch?.step).toBe(
			'C',
		);
		expect(ps.getExitCode()).toBe(0);
	});

	it('reports conversion failures with a nonzero exit code', async () => {
		await mdom.run(deps, [
			'convert',
			'--input',
			'missing.gp',
			'--output',
			'result.xml',
		]);

		expect(ps.getExitCode()).toBe(1);
		expect(log.entries).toContainEqual(
			expect.objectContaining({
				level: 'error',
				message: expect.stringContaining('/scores/missing.gp'),
			}),
		);
		expect(files.contents.size).toBe(0);
	});

	it('forwards test filters and flags without consuming their values', async () => {
		await mdom.run(deps, [
			'test',
			'guitar-pro',
			'--coverage',
			'--timeout',
			'10000',
		]);

		expect(ps.getCalls()).toEqual([
			'bun test guitar-pro --coverage --timeout 10000',
		]);
		expect(ps.getCallDirs()).toEqual(['/repository']);
	});

	it('forwards test flags before a filter', async () => {
		await mdom.run(deps, ['test', '--coverage', 'guitar-pro']);

		expect(ps.getCalls()).toEqual(['bun test --coverage guitar-pro']);
	});

	it('forwards help to bun test after the separator', async () => {
		await mdom.run(deps, ['test', '--', '--help']);

		expect(ps.getCalls()).toEqual(['bun test --help']);
	});

	it('preserves a failing test process exit code', async () => {
		ps.simulate(async () => 7);
		await mdom.run(deps, ['test']);

		expect(ps.getExitCode()).toBe(7);
	});

	it('runs format, lint and type checks with writing enabled by default', async () => {
		await mdom.run(deps, ['fix']);

		expect(ps.getCalls()).toEqual([
			'bunx biome check . --write --unsafe',
			'bunx tsc --noEmit',
		]);
	});

	it('checks without writing when requested', async () => {
		await mdom.run(deps, ['fix', '--check']);

		expect(ps.getCalls()).toEqual(['bunx biome check .', 'bunx tsc --noEmit']);
	});

	it('runs both checks and reports their failures', async () => {
		ps.simulate(async () => 1);
		await mdom.run(deps, ['fix', '--check']);

		expect(ps.getCalls()).toEqual(['bunx biome check .', 'bunx tsc --noEmit']);
		expect(ps.getExitCode()).toBe(1);
		expect(log.entries).toContainEqual(
			expect.objectContaining({
				level: 'error',
				message: 'error: fix failed: check, typecheck',
			}),
		);
	});

	it('rejects invalid release types before any release work', async () => {
		await mdom.run(deps, ['release', 'typo']);

		expect(ps.getExitCode()).toBe(1);
		expect(ps.getCalls()).toEqual([]);
	});
});
