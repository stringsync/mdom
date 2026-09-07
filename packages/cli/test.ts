import { NodePs, type Ps } from 'webappwiz/system';

export interface TestOptions {
	args: string[];
	ps?: Ps;
}

/** Runs the repository tests, forwarding arguments and a failing exit code. */
export async function test(opts: TestOptions): Promise<void> {
	const ps = opts.ps ?? new NodePs();
	const { exitCode } = await ps.spawn(['bun', 'test', ...opts.args]);
	if (exitCode !== 0) {
		ps.exit(exitCode);
	}
}
