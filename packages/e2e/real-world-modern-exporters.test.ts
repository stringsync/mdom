import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('modern exporter dialects', () => {
	it('reads GP8 tab tuning while leaving GP processing-instruction content opaque', () => {
		const score = loadScore(EXAMPLES.ALOOF_GP8);
		expect(score.parts).toHaveLength(1);
		const part = score.parts[0]!;
		expect(part.measures).toHaveLength(16);
		const notes = part.measures.flatMap((measure) => measure.notes);
		expect(notes).toHaveLength(272);
		expect(notes.filter((note) => note.hammerOns.length > 0)).toHaveLength(32);
		// GP8 puts staff 1's tuning inside a <?GP ... ?> instruction;
		// only staff 2 has actual MusicXML staff-tuning elements.
		expect(part.getStaffTunings('1')).toEqual([]);
		expect(part.getStaffTunings('2').map((tuning) => tuning.midi)).toEqual([
			40, 45, 50, 55, 59, 64,
		]);
	});

	it('reads the user-supplied Guitar Pro notation and tab across sixteen bars', () => {
		const score = loadScore(EXAMPLES.ALOOF_GP7);
		expect(score.parts).toHaveLength(1);
		const part = score.parts[0]!;
		expect(part.measures).toHaveLength(16);
		const notes = part.measures.flatMap((measure) => measure.notes);
		expect(notes).toHaveLength(272);
		expect(notes.filter((note) => note.hammerOns.length > 0)).toHaveLength(32);
	});

	it('reads the Sibelius drop-D tab string and fret independently of the notation part', () => {
		const score = loadScore(EXAMPLES.SIBELIUS_2023_TAB);
		expect(score.parts).toHaveLength(2);
		const tab = score.parts[1]!;
		expect(tab.getStaffTunings().map((tuning) => tuning.midi)).toEqual([
			38, 45, 50, 55, 59, 64,
		]);
		const note = tab.measures[0]!.notes[0]!;
		expect(note.string).toBe(6);
		expect(note.fret).toBe(3);
	});

	it('reads both Dorico notations blocks on the tied bass note', () => {
		const score = loadScore(EXAMPLES.DORICO_4_NOTATIONS);
		expect(score.parts).toHaveLength(4);
		const note = score.parts[3]!.measures[3]!.notes[1]!;
		expect(note.childrenNamed('notations')).toHaveLength(2);
		expect(note.ties).toHaveLength(1);
		expect(note.slurs).toHaveLength(1);
		expect(note.ties[0]!.partner).not.toBeNull();
		expect(note.slurs[0]!.partner).not.toBeNull();
	});
});
