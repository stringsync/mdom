import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// Grace notes steal no timeline time, so they never surface as an onset of their
// own — the only way to reach them is from the note they ornament.
const GRACES = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note>
  <note><grace slash="yes"/><pitch><step>B</step><octave>4</octave></pitch><type>16th</type></note>
  <note><grace/><pitch><step>A</step><octave>4</octave></pitch><type>16th</type></note>
  <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

describe('note — the grace run before a note', () => {
	const measure = new MDOMParser()
		.parseFromString(GRACES)
		.score.getPart('P1')!
		.getMeasure('1')!;
	const [first, , , second] = measure.notes;

	it('returns the run immediately preceding, in play order', () => {
		expect(second!.gracesBefore.map((note) => note.pitch?.step)).toEqual([
			'B',
			'A',
		]);
		expect(second!.gracesBefore[0]!.graceSlash).toBe(true);
	});

	it('is empty for a note with nothing graced onto it', () => {
		expect(first!.gracesBefore).toEqual([]);
	});

	it('reaches its measure and part without touching .parent', () => {
		expect(first!.measure).toBe(measure);
		expect(first!.part.id).toBe('P1');
		expect(measure.part.id).toBe('P1');
	});
});

// Each grace carries a different playback-timing attribute under <divisions>4</divisions>,
// so make-time's beats conversion is visible (2 divisions → half a beat).
const TIMED = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><grace steal-time-previous="50"/><pitch><step>B</step><octave>4</octave></pitch><type>16th</type></note>
  <note><grace steal-time-following="33.3"/><pitch><step>A</step><octave>4</octave></pitch><type>16th</type></note>
  <note><grace make-time="2"/><pitch><step>G</step><octave>4</octave></pitch><type>16th</type></note>
  <note><grace steal-time-previous="150" steal-time-following="abc" make-time=""/><pitch><step>F</step><octave>4</octave></pitch><type>16th</type></note>
  <note><grace/><pitch><step>E</step><octave>4</octave></pitch><type>16th</type></note>
  <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

describe('note — grace playback timing', () => {
	const [previous, following, made, odd, plain, sounded] = new MDOMParser()
		.parseFromString(TIMED)
		.score.getPart('P1')!
		.getMeasure('1')!.notes;

	it('reads steal-time-previous as the percent written, null when absent', () => {
		expect(previous!.graceStealTimePrevious).toBe(50);
		expect(following!.graceStealTimePrevious).toBeNull();
		expect(plain!.graceStealTimePrevious).toBeNull();
		expect(sounded!.graceStealTimePrevious).toBeNull(); // not a grace note
	});

	it('reads steal-time-following as the percent written, null when absent', () => {
		expect(following!.graceStealTimeFollowing).toBe(33.3);
		expect(previous!.graceStealTimeFollowing).toBeNull();
		expect(plain!.graceStealTimeFollowing).toBeNull();
		expect(sounded!.graceStealTimeFollowing).toBeNull();
	});

	it('reads make-time in quarter-note beats under the divisions in effect', () => {
		expect(made!.graceMakeTime).toBe(0.5); // 2 divisions at 4 per quarter
		expect(previous!.graceMakeTime).toBeNull();
		expect(plain!.graceMakeTime).toBeNull();
		expect(sounded!.graceMakeTime).toBeNull();
	});

	it('passes out-of-range percents through and reads non-numbers as null', () => {
		expect(odd!.graceStealTimePrevious).toBe(150); // unclamped
		expect(odd!.graceStealTimeFollowing).toBeNull(); // "abc"
		expect(odd!.graceMakeTime).toBeNull(); // ""
	});
});
