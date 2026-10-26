import { describe, expect, it } from 'bun:test';
import { MDOMParser, type MDocument, type Note } from '@stringsync/mdom';
import {
	heapUsed,
	measureOperation,
	type Operation,
} from './scaling-operations';
import { syntheticScore } from './scaling-score';

// Evidence and axis limitations: notes/performance-audit.md (#42).
// Only measures grow: one part, one voice, four notes per measure.
const sizes = [64, 256] as const;
const parser = new MDOMParser();
const seed = parser.parseFromString(
	'<score-partwise><part-list/><part id="P1"><measure><note><pitch><step>C</step><octave>4</octave></pitch></note></measure></part></score-partwise>',
);
const inputs = sizes.map((measures) =>
	syntheticScore(seed, { measures, parts: 1, voices: 1, notes: 4 }),
);
const linearOperations = [
	'mxl-unzip',
	'serialize-xml',
	'serialize-mxl',
	'read-walk',
	'history',
] as const satisfies readonly Operation[];

// A global, observable root prevents JIT liveness from dropping the input at
// one boundary. All readings retain the same document and note handles;
// only history's entries are released. This measures retention, not peak heap.
const roots = new Set<{ document: MDocument; notes: Note[] }>();
function historyRetention(xml: string, entries: number) {
	const document = parser.parseFromString(xml);
	const notes = document.score.parts.flatMap((part) =>
		part.measures.flatMap((measure) => measure.notes),
	);
	const root = { document, notes };
	roots.add(root);
	const history = document.history;
	try {
		for (let index = 0; index < entries; index++) {
			const note = notes[index % notes.length]!;
			history.edit('pitch', () =>
				note.setPitch({
					step: note.pitch?.step === 'C' ? 'D' : 'C',
					octave: 5,
				}),
			);
		}
		let undone = 0;
		while (history.undo()) {
			undone++;
		}
		let redone = 0;
		while (history.redo()) {
			redone++;
		}
		expect(undone).toBe(entries);
		expect(redone).toBe(entries);
		const retainedControlBytes = heapUsed();
		const retainedBytes = heapUsed();
		history.dispose();
		const releasedBytes = heapUsed();
		const releasedControlBytes = heapUsed();
		expect(roots.has(root)).toBe(true);
		expect(root.document.score.parts[0]!.measures).toHaveLength(
			notes.length / 4,
		);
		return {
			entries,
			retainedControlBytes,
			releasedControlBytes,
			retainedBytes,
			releasedBytes,
			retained: retainedBytes - releasedBytes,
		};
	} finally {
		history.dispose();
		roots.delete(root);
	}
}

describe('bounded-density measure scaling guards (64 → 256)', () => {
	for (const operation of linearOperations) {
		it(`${operation} time grows less than 6x for 4x measures`, async () => {
			// Warm both sizes, but use fresh documents per measured operation so
			// cached read results cannot turn this into a warm-cache-only guard.
			for (const xml of inputs) {
				await measureOperation(operation, xml, 0);
			}
			const samples: number[][] = [[], []];
			for (let run = 0; run < 3; run++) {
				// Alternate order to avoid consistently favoring one size.
				for (const index of run % 2 ? [1, 0] : [0, 1]) {
					const sample = await measureOperation(operation, inputs[index]!, 0);
					expect(sample.workUnits).toBe(sizes[index]! * 4);
					expect(sample.checksum).toBeGreaterThan(0);
					samples[index]!.push(sample.elapsedMs);
				}
			}
			const small = Math.min(...samples[0]!);
			const large = Math.min(...samples[1]!);
			const evidence = JSON.stringify({
				operation,
				sizes,
				samples,
				small,
				large,
			});
			expect(small, evidence).toBeGreaterThan(0);
			expect(large / small, evidence).toBeLessThan(6);
		});
	}

	for (const fixedEntries of [false, true]) {
		it(`pitch-history retention ${fixedEntries ? 'stays bounded with fixed entries' : 'grows less than 6x with 4x entries'}`, () => {
			// Warm allocation/GC paths before comparing paired retained/released
			// boundaries. Keep raw bytes in failures; never divide signed noise.
			historyRetention(inputs[0]!, 256);
			const samples = inputs.map((xml, index) =>
				Array.from({ length: 3 }, () =>
					historyRetention(xml, fixedEntries ? 256 : sizes[index]! * 4),
				),
			);
			const evidence = JSON.stringify({ sizes, fixedEntries, samples });
			for (const sample of samples.flat()) {
				expect(sample.retained, evidence).toBeGreaterThan(0);
				// No-op collections at each boundary must be small relative to the
				// released history. Setup-to-edit deltas are deliberately unused:
				// the audit found unrelated temporary roots make them unstable.
				const noise = Math.max(
					Math.abs(sample.retainedControlBytes - sample.retainedBytes),
					Math.abs(sample.releasedControlBytes - sample.releasedBytes),
				);
				expect(noise / sample.retained, evidence).toBeLessThan(0.1);
			}
			const small = Math.min(...samples[0]!.map((sample) => sample.retained));
			const large = Math.min(...samples[1]!.map((sample) => sample.retained));
			expect(large / small, evidence).toBeLessThan(fixedEntries ? 2 : 6);
		});
	}

	it.todo('edit-insert/read, edit-remove/read, edit-set/read: #45 scoped-read-caches', () => {});
	it.todo('GP export/import: #66 indexed-gp-events, #46 bulk-tree-construction, #45 scoped-read-caches', () => {});
	it.todo('wide XML/GPIF parsing: #46 bulk-tree-construction (measure and density axes)', () => {});
	it.todo('cursor measure/density walks and dense read-walk: #47 indexed-score-walks', () => {});
	it.todo('spanner creation: #49 indexed-spanner-numbers (static audit evidence; needs a span workload)', () => {});
});
