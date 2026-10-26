import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('iReal — rehearsal marks', () => {
	it('reads each mark, with an unstated enclosure staying null', () => {
		const marks = loadScore(EXAMPLES.REHEARSAL_MARKS_BOLIVIA)
			.parts[0]!.measures.flatMap((measure) => measure.directions)
			.flatMap((direction) => direction.rehearsals);
		expect(marks.map((mark) => mark.text)).toEqual(['Intro', 'A', 'B']);
		expect(marks.every((mark) => mark.enclosure === null)).toBe(true);
	});
});

describe('iReal — chord degrees', () => {
	it('reads the altered and added tones of each extended chord', () => {
		const measures = loadScore(EXAMPLES.REHEARSAL_MARKS_BOLIVIA).parts[0]!
			.measures;
		const chords = measures
			.flatMap((measure) => measure.harmonies)
			.filter((harmony) => harmony.degrees.length > 0)
			.map((harmony) => [
				harmony.measure.number,
				harmony.root!.step,
				harmony.kind!.text,
				...harmony.degrees.map(
					(degree) => `${degree.type} ${degree.value} ${degree.alter}`,
				),
			]);
		expect(chords[0]).toEqual(['12', 'A', '13', 'alter 9 -1']);
		expect(chords).toHaveLength(5);
	});
});
