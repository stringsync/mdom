import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { GuitarProParser, MDOMParser } from '@stringsync/mdom';
import { NodeFs, NodePs } from 'webappwiz/system';
import {
	measureOperation,
	operations,
	type Sample,
} from './scaling-operations';
import { type CaseResult, formatTable, summarize } from './scaling-report';
import { repeatScore, scoreCounts, syntheticScore } from './scaling-score';

const parser = new MDOMParser();
const seedXml = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Seed</part-name></score-part></part-list><part id="P1">
<measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>1</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><direction-type><wedge type="crescendo" number="1"/></direction-type></direction><note id="first"><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><tie type="start"/><voice>1</voice><type>quarter</type><notations><tied type="start"/><slur number="1" type="start"/></notations></note></measure>
<measure number="2"><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/><slur number="1" type="stop"/></notations></note><direction><direction-type><wedge type="stop" number="1"/></direction-type></direction></measure></part></score-partwise>`;

function sample(elapsedMs: number, heapDeltaBytes: number): Sample {
	return {
		elapsedMs,
		heapDeltaBytes,
		documentHeapBytes: heapDeltaBytes,
		heapBeforeBytes: 100,
		heapAfterBytes: 100 + heapDeltaBytes,
		checksum: 1,
		workUnits: 1,
		inputParts: 1,
	};
}

describe('scaling benchmark', () => {
	it('repeats real measures with paired spans and strips dangling truncated endpoints', () => {
		const xml = repeatScore(parser.parseFromString(seedXml), 5, 2);
		const document = parser.parseFromString(xml);
		expect(document.score.parts.map((part) => part.id)).toEqual([
			'P1-bench-1',
			'P1-bench-2',
		]);
		for (const part of document.score.parts) {
			expect(part.measures.map((measure) => measure.number)).toEqual([
				'1',
				'2',
				'3',
				'4',
				'5',
			]);
			expect(
				part.measures.map((measure) => measure.notes[0]!.divisions),
			).toEqual([1, 1, 1, 1, 1]);
			for (const measure of part.measures.slice(0, 4)) {
				const note = measure.notes[0]!;
				expect(note.slurs[0]!.partner).not.toBeNull();
				expect(note.ties[0]!.partner).not.toBeNull();
			}
			expect(part.measures[4]!.notes[0]!.slurs).toHaveLength(0);
			expect(part.measures[4]!.notes[0]!.ties).toHaveLength(0);
		}
		expect((xml.match(/<wedge type="crescendo"/g) ?? []).length).toBe(4);
		expect((xml.match(/<wedge type="stop"/g) ?? []).length).toBe(4);
		expect(xml).not.toContain('id="first"');
	});

	it('generates independent dimensions with aligned voices and complete ties/slurs', () => {
		const xml = syntheticScore(parser.parseFromString(seedXml), {
			measures: 3,
			parts: 2,
			voices: 3,
			notes: 4,
		});
		expect(scoreCounts(xml)).toEqual({
			measures: 3,
			parts: 2,
			voices: 3,
			notes: 12,
			totalMeasures: 6,
			totalNotes: 72,
		});
		for (const part of parser.parseFromString(xml).score.parts) {
			for (const measure of part.measures) {
				expect(measure.endBeat).toBe(4);
				for (const voice of measure.voices) {
					expect(voice.notes.map((note) => note.measureBeat)).toEqual([
						0, 1, 2, 3,
					]);
					for (const note of voice.notes) {
						for (const tie of note.ties) {
							expect(tie.partner).not.toBeNull();
						}
						for (const slur of note.slurs) {
							expect(slur.partner).not.toBeNull();
						}
					}
				}
			}
		}
	});

	it('uses medians and only compares exact doublings, flagging growth above three', () => {
		const results: CaseResult[] = [
			{
				operation: 'parse',
				size: 1,
				samples: [sample(1, 10), sample(100, 1000), sample(2, 20)],
			},
			{ operation: 'parse', size: 2, samples: [sample(8, 80)] },
			{ operation: 'parse', size: 8, samples: [sample(16, -1)] },
			{
				operation: 'cursor',
				size: 1,
				samples: [],
				error: 'unsupported fixture',
			},
		];
		const rows = summarize(results, 'measures');
		expect(rows[0]).toMatchObject({
			elapsedMs: 2,
			heapBytes: 20,
			timeRatio: null,
		});
		expect(rows[1]).toMatchObject({
			timeRatio: 4,
			heapRatio: 4,
			flagged: true,
		});
		expect(rows[2]).toMatchObject({ timeRatio: null, heapRatio: null });
		expect(formatTable(rows)).toContain('ERROR: unsupported fixture');
	});

	for (const operation of operations) {
		it(`runs ${operation} on a tiny fixture and reports finite metrics`, async () => {
			const files = new NodeFs();
			const seed =
				operation === 'gp-parse' || operation === 'serialize-gp'
					? await new GuitarProParser().parseFromBytes(
							await files.readBytes(
								`${import.meta.dir}/../mdom/fixtures/guitar-pro/notes.gp`,
							),
						)
					: parser.parseFromString(seedXml);
			const xml = syntheticScore(seed, {
				measures: 1,
				parts: 1,
				voices: 1,
				notes: 2,
			});
			const result = await measureOperation(operation, xml, 4);
			expect(Number.isFinite(result.elapsedMs)).toBe(true);
			expect(Number.isFinite(result.heapAfterBytes)).toBe(true);
			expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
			if (operation === 'history') {
				expect(result.history?.entries).toBe(4);
				expect(result.checksum).toBe(4);
				expect(result.phasesMs).toBeDefined();
			} else if (operation === 'cursor') {
				expect(result.checksum).toBe(2);
			} else if (operation.startsWith('edit-')) {
				expect(result.workUnits).toBe(operation === 'edit-remove-read' ? 2 : 4);
				expect(result.checksum).toBe(result.workUnits);
			}
		}, 30000);
	}

	it('repeats the largest real XML seed at a truncated boundary', async () => {
		const files = new NodeFs();
		const seed = parser.parseFromString(
			await files.read(`${import.meta.dir}/examples/actor_prelude_sample.xml`),
		);
		const document = parser.parseFromString(repeatScore(seed, 1));
		expect(document.score.parts).toHaveLength(seed.score.parts.length);
		for (const part of document.score.parts) {
			expect(part.measures).toHaveLength(1);
			for (const note of part.measures[0]!.notes) {
				for (const marker of [...note.slurs, ...note.ties]) {
					expect(marker.partner).not.toBeNull();
				}
			}
		}
	}, 30000);

	it('writes machine-readable doubling results from isolated child samples', async () => {
		const processes = new NodePs();
		const files = new NodeFs();
		const outputPath = `${tmpdir()}/mdom-scaling-test-${processes.pid}.json`;
		try {
			const result = await processes.spawnCapture([
				'bun',
				`${import.meta.dir}/scaling.bench.ts`,
				'--operation',
				'read-walk',
				'--base',
				'1',
				'--steps',
				'2',
				'--samples',
				'1',
				'--json',
				outputPath,
			]);
			expect(result.exitCode).toBe(0);
			const report = JSON.parse(await files.read(outputPath));
			expect(report.schemaVersion).toBe(1);
			expect(report.isolation).toBe('fresh process per sample');
			expect(report.results.map((row: CaseResult) => row.size)).toEqual([1, 2]);
			expect(report.summary[1].timeRatio).toBeGreaterThan(0);
		} finally {
			await files.rm(outputPath, { force: true });
		}
	}, 30000);

	it('runs a single profiled case through the CLI and rejects invalid options', async () => {
		const processes = new NodePs();
		const success = await processes.spawnCapture([
			'bun',
			`${import.meta.dir}/scaling.bench.ts`,
			'--operation',
			'parse',
			'--size',
			'1',
			'--sample',
		]);
		expect(success.exitCode).toBe(0);
		const result = JSON.parse(success.stdout) as CaseResult;
		expect(result.error).toBeUndefined();
		expect(result.counts?.measures).toBe(1);
		expect(result.samples).toHaveLength(1);
		const invalid = await processes.spawnCapture([
			'bun',
			`${import.meta.dir}/scaling.bench.ts`,
			'--size',
			'0',
		]);
		expect(invalid.exitCode).not.toBe(0);
	}, 30000);
});
