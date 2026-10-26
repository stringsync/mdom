import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('LilyPond — the dialects that break an assumption', () => {
	it('reads an unmetered senza-misura signature', () => {
		const time = loadScore(
			EXAMPLES['LILYPOND_11H-TIMESIGNATURES-SENZAMISURA'],
		).parts[0]!.measures[0]!.getTime()!;
		expect(time.isSenzaMisura).toBe(true);
		expect(time.beats).toBeNull(); // there is no meter to report
	});

	it('carries a mid-score <divisions> change into the beats it reports', () => {
		const measures = loadScore(EXAMPLES['LILYPOND_03C-RHYTHM-DIVISIONCHANGE'])
			.parts[0]!.measures;
		const divisions = measures.map((measure) => measure.notes[0]!.divisions);
		expect(new Set(divisions).size).toBeGreaterThan(1); // the file really does change it
		// Whatever the divisions, a quarter note is one beat.
		for (const measure of measures) {
			const quarter = measure.notes.find((note) => note.type === 'quarter');
			if (quarter) {
				expect(quarter.beats).toBe(1);
			}
		}
	});

	it('keeps a volta number as the raw list MusicXML writes', () => {
		const endings = loadScore(EXAMPLES['LILYPOND_45F-REPEATS-INVALIDENDINGS'])
			.parts[0]!.measures.flatMap((measure) => measure.barlines)
			.flatMap((barline) => (barline.ending ? [barline.ending] : []));
		expect(endings.map((ending) => ending.number)).toContain('1, 2, 3');
		expect(endings.map((ending) => ending.type)).toContain('discontinue');
	});

	it('reports an out-of-spec octave-shift size rather than snapping it', () => {
		const shifts = loadScore(
			EXAMPLES['LILYPOND_33E-SPANNERS-OCTAVESHIFTS-INVALIDSIZE'],
		)
			.parts[0]!.measures.flatMap((measure) => measure.directions)
			.flatMap((direction) => direction.octaveShifts);
		expect(shifts.map((shift) => shift.size)).toEqual([27, 27, 11, 11]);
		expect(shifts[0]!.partner).toBe(shifts[1]!); // still pairs, invalid size and all
	});

	it('reads a multi-staff measure whose keys differ after a <backup>', () => {
		const measure = loadScore(
			EXAMPLES['LILYPOND_43C-MULTISTAFF-DIFFERENTKEYSAFTERBACKUP'],
		).parts[0]!.measures[0]!;
		expect(measure.staveCount).toBe(2);
		expect(measure.getKey('1')?.fifths).not.toBe(measure.getKey('2')?.fifths);
	});

	it('measures an incomplete bar as short without calling it malformed', () => {
		const measures = loadScore(EXAMPLES['LILYPOND_46F-INCOMPLETEMEASURES'])
			.parts[0]!.measures;
		const beatsPerBar = Number(measures[0]!.getTime()!.beats);
		expect(measures.some((measure) => measure.endBeat < beatsPerBar)).toBe(
			true,
		);
		expect(measures.every((measure) => measure.endBeat >= 0)).toBe(true);
	});
});

describe('LilyPond 71f — every chord type', () => {
	const measures = loadScore('lilypond/71f-AllChordTypes.xml').parts[0]!
		.measures;

	it('reads an inversion', () => {
		const [inverted] = measures[8]!.harmonies;
		expect(inverted!.root).toMatchObject({ step: 'F', alter: 1 });
		expect(inverted!.inversion).toEqual({ value: 2, text: null });
	});

	it('reads a subtracted and an altered degree in order', () => {
		const degrees = measures[9]!.harmonies[0]!.degrees;
		expect(
			degrees.map((degree) => [degree.type, degree.value, degree.alter]),
		).toEqual([
			['subtract', 3, 0],
			['alter', 5, -1],
		]);
	});
});
