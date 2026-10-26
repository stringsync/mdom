import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

const SAMPLE = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
  <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
  <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

const notes = () =>
	new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!
		.notes;

describe('legato writers', () => {
	it('addSlide pairs markers with a line type and removeSlide undoes it', () => {
		const [a, b] = notes();
		const slide = a!.addSlide(b!, { lineType: 'dashed' });
		expect(slide.slideType).toBe('start');
		expect(slide.lineType).toBe('dashed');
		expect(slide.partner?.note).toBe(b!);
		b!.removeSlide(a!);
		expect(a!.slides).toEqual([]);
		expect(b!.slides).toEqual([]);
	});

	it('addGlissando pairs markers', () => {
		const [a, b] = notes();
		a!.addGlissando(b!);
		expect(b!.glissandos[0]!.glissandoType).toBe('stop');
		a!.removeGlissando(b!);
		expect(b!.glissandos).toEqual([]);
	});

	it('addHammerOn and addPullOff write H/P text in technical', () => {
		const [a, b, c] = notes();
		a!.addHammerOn(b!);
		b!.addPullOff(c!);
		expect(a!.hammerOns[0]!.text).toBe('H');
		expect(b!.hammerOns[0]!.hammerOnType).toBe('stop');
		expect(b!.pullOffs[0]!.text).toBe('P');
		expect(c!.pullOffs[0]!.partner?.note).toBe(b!);
		expect(a!.child('notations')!.child('technical')).not.toBeNull();
		a!.removeHammerOn(b!);
		b!.removePullOff(c!);
		expect(b!.hammerOns).toEqual([]);
		expect(c!.pullOffs).toEqual([]);
	});

	it('numbers do not collide between overlapping spans', () => {
		const [a, b, c] = notes();
		const first = a!.addHammerOn(c!);
		const second = a!.addHammerOn(b!);
		expect(second.number).not.toBe(first.number);
	});

	it('addVibrato writes a wavy line, also over one note', () => {
		const [a, b] = notes();
		a!.addVibrato(b!);
		expect(a!.wavyLines[0]!.partner?.note).toBe(b!);
		b!.addVibrato(b!);
		expect(b!.wavyLines.length).toBe(3);
		a!.removeVibrato(b!);
		expect(a!.wavyLines).toEqual([]);
	});
});
