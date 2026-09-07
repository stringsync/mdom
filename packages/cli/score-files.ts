/** Reads and writes score files without interpreting their binary contents. */
export interface ScoreFiles {
	read(path: string): Promise<Uint8Array<ArrayBuffer>>;
	write(
		path: string,
		bytes: Uint8Array,
		opts: ScoreWriteOptions,
	): Promise<void>;
}

export interface ScoreWriteOptions {
	/** Replace an existing output only when explicitly requested. */
	overwrite: boolean;
}
