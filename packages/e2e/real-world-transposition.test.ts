import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('W3C — a concert score with a transposed part declared', () => {
	const score = loadScore(EXAMPLES.CONCERT_SCORE_AND_FOR_PART);

	it('reads the concert flag, its octave transposition and the for-part', () => {
		expect(score.isConcertScore).toBe(true);
		const octave = score.getPart('P1')!.measures[0]!.getTranspose()!;
		expect([octave.diatonic, octave.chromatic, octave.octaveChange]).toEqual([
			0, 0, 1,
		]);
		const forPart = score.getPart('P3')!.measures[0]!.getForPart()!;
		expect(forPart.partClef!.sign).toBe('G');
		expect(forPart.partTranspose.semitones).toBe(-14);
		expect(score.getPart('P3')!.measures[0]!.getClef()!.sign).toBe('F');
		expect(score.getPart('P3')!.measures[0]!.getTranspose()).toBeNull();
	});
});

describe('Guitar Pro 7 — a guitar written an octave up', () => {
	it('reads the per-staff transposition, separate from the clef', () => {
		const measure = loadScore(EXAMPLES.ALOOF_GP7).parts[0]!.measures[3]!;
		const guitar = measure.getTranspose('1')!;
		expect(guitar.staff).toBe('1');
		expect(guitar.semitones).toBe(-12);
		expect(measure.getTranspose('2')).toBeNull();
		expect(measure.notes[0]!.transpose).toBe(guitar);
	});
});

describe('LilyPond 72c — a transposition change', () => {
	it('carries the new transposition from the measure that changes it', () => {
		const measures = loadScore('lilypond/72c-TransposingInstruments-Change.xml')
			.parts[0]!.measures;
		expect(measures[0]!.getTranspose()!.chromatic).toBe(3);
		expect(measures[1]!.getTranspose()!.chromatic).toBe(-2);
		expect(measures[2]!.notes[0]!.transpose!.diatonic).toBe(-1);
	});
});
