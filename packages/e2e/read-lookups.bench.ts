import * as fs from 'node:fs';
import { MDOMParser } from '@stringsync/mdom';

// Times the read lookups a renderer makes over a whole score, so a regression to
// per-call part rescans (quadratic in score length) shows up as a ratio. Pass
// MusicXML paths; the default is the Der Lindenbaum repeats vexml profiled.
//
//   bun packages/e2e/read-lookups.bench.ts [file.musicxml ...]

const files = process.argv.slice(2);
if (files.length === 0) {
	files.push(
		'/tmp/linden/linden-205.musicxml',
		'/tmp/linden/linden-1025.musicxml',
	);
}

const results: Array<{ file: string; measures: number; lookupMs: number }> = [];
for (const file of files) {
	const xml = fs.readFileSync(file, 'utf8');
	const parseStart = performance.now();
	const score = new MDOMParser().parseFromString(xml).score;
	const parseMs = performance.now() - parseStart;

	const lookupStart = performance.now();
	let measureCount = 0;
	let checksum = 0;
	for (const part of score.parts) {
		const count = part.measures.length;
		measureCount = Math.max(measureCount, count);
		for (let index = 0; index < count; index++) {
			const measure = part.measures[index]!;
			for (let staff = 1; staff <= measure.staveCount; staff++) {
				if (measure.getClef(String(staff))) {
					checksum++;
				}
			}
			for (const note of measure.notes) {
				checksum += note.measureBeat ?? 0;
				checksum += note.beats ?? 0;
				checksum += note.divisions ?? 0;
				for (const slur of note.slurs) {
					if (slur.slurType === 'start' && slur.partner) {
						checksum++;
					}
				}
				for (const tie of note.ties) {
					if (tie.tieType === 'start' && tie.partner) {
						checksum++;
					}
				}
			}
		}
	}
	const lookupMs = performance.now() - lookupStart;
	results.push({ file, measures: measureCount, lookupMs });
	console.log(
		`${file}: ${measureCount} measures, parse ${parseMs.toFixed(0)}ms, lookups ${lookupMs.toFixed(0)}ms (checksum ${checksum.toFixed(3)})`,
	);
}

const [first, last] = [results[0], results.at(-1)];
if (first && last && first !== last) {
	console.log(
		`${last.measures / first.measures}x the measures cost ${(last.lookupMs / first.lookupMs).toFixed(1)}x the lookup time`,
	);
}
