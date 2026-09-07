import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeScoreFiles } from './node-score-files';

describe('NodeScoreFiles', () => {
	let directory: string;
	let files: NodeScoreFiles;

	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), 'mdom-score-files-'));
		files = new NodeScoreFiles();
	});

	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it('reads bytes without interpreting non-UTF8 data as text', async () => {
		const path = join(directory, 'score.gp');
		await writeFile(path, new Uint8Array([0, 128, 255, 10]));

		expect(await files.read(path)).toEqual(new Uint8Array([0, 128, 255, 10]));
	});

	it('writes an exact binary payload', async () => {
		const path = join(directory, 'score.gp');
		await files.write(path, new Uint8Array([0, 128, 255, 10]), {
			overwrite: false,
		});

		expect(new Uint8Array(await readFile(path))).toEqual(
			new Uint8Array([0, 128, 255, 10]),
		);
	});

	it('refuses to replace an existing file by default', async () => {
		const path = join(directory, 'score.gp');
		await writeFile(path, new Uint8Array([1, 2, 3]));

		await expect(
			files.write(path, new Uint8Array([4]), { overwrite: false }),
		).rejects.toThrow('Use --force');
		expect(new Uint8Array(await readFile(path))).toEqual(
			new Uint8Array([1, 2, 3]),
		);
	});

	it('replaces an existing file when requested', async () => {
		const path = join(directory, 'score.gp');
		await writeFile(path, new Uint8Array([1, 2, 3]));
		await files.write(path, new Uint8Array([4]), { overwrite: true });

		expect(new Uint8Array(await readFile(path))).toEqual(new Uint8Array([4]));
	});

	it('propagates a missing input error', async () => {
		await expect(
			files.read(join(directory, 'missing.gp')),
		).rejects.toMatchObject({ code: 'ENOENT' });
	});

	it('propagates an unwritable output error', async () => {
		await expect(
			files.write(join(directory, 'missing', 'score.gp'), new Uint8Array([4]), {
				overwrite: false,
			}),
		).rejects.toMatchObject({ code: 'ENOENT' });
	});
});
