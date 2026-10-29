import { beforeEach, describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'webappwiz/log';
import { FakeFs, FakePs } from 'webappwiz/system/testing';
import { ship } from './ship';

const GATE = ['bunx biome check .', 'bunx tsc --noEmit'];
const PUSH = 'git -C /repo push origin main';

describe('ship', () => {
	let fs: FakeFs;
	let log: MemoryLogger;
	let ps: FakePs;

	beforeEach(async () => {
		fs = new FakeFs();
		log = new MemoryLogger();
		ps = new FakePs();
		ps.setCwd('/repo');
		await fs.write(
			'/repo/package.json',
			JSON.stringify({ name: '@stringsync/mdom', version: '1.2.3' }),
		);
		const spawnCapture = ps.spawnCapture.bind(ps);
		ps.spawnCapture = async (argv, opts) => {
			const result = await spawnCapture(argv, opts);
			const command = argv.join(' ');
			if (command.endsWith('rev-parse --abbrev-ref HEAD')) {
				return { ...result, stdout: 'main\n' };
			}
			if (command.endsWith('symbolic-ref --short refs/remotes/origin/HEAD')) {
				return { ...result, stdout: 'origin/main\n' };
			}
			return result;
		};
	});

	const opts = () => ({ fs, log, ps, prompt: () => 'n' });

	it('pushes before the checks and leaves the release unstamped when declined', async () => {
		await ship('patch', opts());

		const calls = ps.getCalls();
		const push = calls.indexOf(PUSH);
		expect(calls.slice(0, push)).toEqual([
			'git -C /repo rev-parse --abbrev-ref HEAD',
			'git -C /repo symbolic-ref --short refs/remotes/origin/HEAD',
			'git -C /repo status --porcelain',
			'git -C /repo rev-parse --abbrev-ref HEAD',
		]);
		expect(calls.slice(push + 1, push + 1 + GATE.length)).toEqual(GATE);
		expect(calls).not.toContain('npm publish --access public');
		expect(JSON.parse(await fs.read('/repo/package.json')).version).toBe(
			'1.2.3',
		);
	});

	it('stops before checks and release work when the push is rejected', async () => {
		ps.simulate(async () => (ps.getCalls().at(-1) === PUSH ? 1 : 0));

		await expect(ship('patch', opts())).rejects.toThrow('git push origin main');

		expect(ps.getCalls().at(-1)).toBe(PUSH);
		expect(JSON.parse(await fs.read('/repo/package.json')).version).toBe(
			'1.2.3',
		);
		expect(await fs.exists('/repo/RELEASE')).toBe(false);
	});
});
