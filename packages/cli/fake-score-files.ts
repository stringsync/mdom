import type { ScoreFiles, ScoreWriteOptions } from './score-files';

export class FakeScoreFiles implements ScoreFiles {
	readonly contents = new Map<string, Uint8Array<ArrayBuffer>>();

	async read(path: string): Promise<Uint8Array<ArrayBuffer>> {
		const bytes = this.contents.get(path);
		if (!bytes) {
			throw new Error(`Input does not exist: ${path}`);
		}
		return bytes.slice();
	}

	async write(
		path: string,
		bytes: Uint8Array,
		opts: ScoreWriteOptions,
	): Promise<void> {
		if (!opts.overwrite && this.contents.has(path)) {
			throw new Error(
				`Output already exists: ${path}. Use --force to replace it.`,
			);
		}
		this.contents.set(path, new Uint8Array(bytes));
	}
}
