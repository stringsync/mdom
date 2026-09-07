import { readFile, writeFile } from 'node:fs/promises';
import type { ScoreFiles, ScoreWriteOptions } from './score-files';

// TODO: webappwiz/system once Fs supports binary reads/writes and exclusive creation.
export class NodeScoreFiles implements ScoreFiles {
	async read(path: string): Promise<Uint8Array<ArrayBuffer>> {
		return new Uint8Array(await readFile(path));
	}

	async write(
		path: string,
		bytes: Uint8Array,
		opts: ScoreWriteOptions,
	): Promise<void> {
		try {
			await writeFile(path, bytes, { flag: opts.overwrite ? 'w' : 'wx' });
		} catch (error) {
			if (
				error instanceof Error &&
				'code' in error &&
				error.code === 'EEXIST'
			) {
				throw new Error(
					`Output already exists: ${path}. Use --force to replace it.`,
				);
			}
			throw error;
		}
	}
}
