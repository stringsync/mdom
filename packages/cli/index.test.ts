import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MDOMParser, MDocument, MusicXMLSerializer } from '@stringsync/mdom';
import { NodeFs, NodePs } from 'webappwiz/system';

describe('mdom CLI entrypoint', () => {
	let directory: string;
	let fs: NodeFs;
	let ps: NodePs;
	let cli: string;

	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), 'mdom-cli-'));
		fs = new NodeFs();
		ps = new NodePs();
		cli = new URL('./index.ts', import.meta.url).pathname;
		const document = MDocument.empty();
		document.score
			.addPart({ name: 'Piano' })
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		await fs.write(
			join(directory, 'input.musicxml'),
			new MusicXMLSerializer().serializeToString(document),
		);
	});

	afterEach(async () => {
		await fs.rm(directory, { recursive: true, force: true });
	});

	it('converts from an unrelated working directory using caller-relative paths', async () => {
		const exported = await ps.spawnCapture(
			[
				'bun',
				cli,
				'convert',
				'--input',
				'input.musicxml',
				'--output',
				'output.gp',
			],
			{ cwd: directory },
		);
		const imported = await ps.spawnCapture(
			[
				'bun',
				cli,
				'convert',
				'--input',
				'output.gp',
				'--output',
				'result.musicxml',
			],
			{ cwd: directory },
		);
		const document = new MDOMParser().parseFromString(
			await fs.read(join(directory, 'result.musicxml')),
		);

		expect(exported.exitCode).toBe(0);
		expect(imported.exitCode).toBe(0);
		expect(document.score.parts[0]!.measures[0]!.notes[0]).toMatchObject({
			beats: 4,
			pitch: { step: 'C', octave: 4 },
		});
	});

	it('exits unsuccessfully when a conversion fails', async () => {
		const result = await ps.spawnCapture(
			[
				'bun',
				cli,
				'convert',
				'--input',
				'missing.gp',
				'--output',
				'result.xml',
			],
			{ cwd: directory },
		);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain('missing.gp');
		expect(await fs.exists(join(directory, 'result.xml'))).toBe(false);
	});

	it('keeps an existing output unless force is passed', async () => {
		await fs.write(join(directory, 'result.xml'), 'keep me');
		const refused = await ps.spawnCapture(
			[
				'bun',
				cli,
				'convert',
				'--input',
				'input.musicxml',
				'--output',
				'result.xml',
			],
			{ cwd: directory },
		);
		const untouched = await fs.read(join(directory, 'result.xml'));
		const forced = await ps.spawnCapture(
			[
				'bun',
				cli,
				'convert',
				'--input',
				'input.musicxml',
				'--output',
				'result.xml',
				'--force',
			],
			{ cwd: directory },
		);

		expect(refused.exitCode).toBe(1);
		expect(untouched).toBe('keep me');
		expect(forced.exitCode).toBe(0);
		expect(
			new MDOMParser().parseFromString(
				await fs.read(join(directory, 'result.xml')),
			).score.parts[0]!.label,
		).toBe('Piano');
	});
});
