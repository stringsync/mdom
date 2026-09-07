import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// Continuo numerals under a bass line: a 6-4 stack with a sharpened 6, then a
// bare accidental figure (no <figure-number>), then a figure with an extend line.
const SAMPLE = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <figured-bass parentheses="yes" placement="below">
    <figure><prefix>sharp</prefix><figure-number>6</figure-number></figure>
    <figure><figure-number>4</figure-number><suffix>slash</suffix></figure>
  </figured-bass>
  <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration></note>
  <note><chord/><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration></note>
  <figured-bass>
    <figure><prefix>flat</prefix></figure>
    <figure><figure-number>7</figure-number><extend/></figure>
  </figured-bass>
  <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

describe('figured-bass — the continuo stack and what it binds to', () => {
  const measure = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!;
  const [first, second] = measure.figuredBasses;

  it('collects each stack in the measure, top figure first', () => {
    expect(measure.figuredBasses).toHaveLength(2);
    expect(first!.figures.map((figure) => figure.number)).toEqual(['6', '4']);
  });

  it('reads a figure prefix, number and suffix', () => {
    const [six, four] = first!.figures;
    expect(six!.prefix).toBe('sharp');
    expect(six!.suffix).toBeNull();
    expect(four!.suffix).toBe('slash');
    expect(four!.extend).toBe(false);
  });

  it('reads an accidental-only figure and an extend line', () => {
    const [accidental, seventh] = second!.figures;
    expect(accidental!.prefix).toBe('flat');
    expect(accidental!.number).toBeNull();
    expect(seventh!.extend).toBe(true);
  });

  it('reads parentheses and placement', () => {
    expect(first!.parentheses).toBe(true);
    expect(first!.placement).toBe('below');
    expect(second!.parentheses).toBe(false);
    expect(second!.placement).toBeNull();
  });

  it('binds to the nearest non-chord note after it, like a harmony', () => {
    expect(first!.nextNote?.pitch?.step).toBe('C');
    expect(second!.nextNote?.pitch?.step).toBe('G'); // skips the <chord/> member
  });
});
