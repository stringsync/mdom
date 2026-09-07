import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A guitar part: a notation staff and a 6-line tablature staff whose tuning is
// declared once, in measure 1, and carries forward. The lowest string sits on
// line 1 (MusicXML numbers tuning lines bottom-up), which is string 6.
const SAMPLE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions><staves>2</staves>
      <staff-details number="2">
        <staff-lines>6</staff-lines>
        <staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
        <staff-tuning line="2"><tuning-step>A</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
        <staff-tuning line="3"><tuning-step>D</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
        <staff-tuning line="4"><tuning-step>G</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
        <staff-tuning line="5"><tuning-step>B</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
        <staff-tuning line="6"><tuning-step>E</tuning-step><tuning-alter>-1</tuning-alter><tuning-octave>4</tuning-octave></staff-tuning>
      </staff-details>
    </attributes>
    <note><pitch><step>E</step><octave>2</octave></pitch><duration>4</duration></note>
  </measure>
  <measure number="2">
    <note><pitch><step>A</step><octave>2</octave></pitch><duration>4</duration></note>
  </measure>
</part></score-partwise>`;

describe('staff-tuning — the strings that identify a tablature staff', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const tunings = part.getStaffTunings('2');

  it('finds the first declaration anywhere in the part', () => {
    expect(tunings.map((tuning) => tuning.line)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(part.getStaffTunings('1')).toEqual([]);
  });

  it('reads step, octave and alter, defaulting alter to 0', () => {
    expect(tunings[0]!.step).toBe('E');
    expect(tunings[0]!.octave).toBe(2);
    expect(tunings[0]!.alter).toBe(0);
    expect(tunings[5]!.alter).toBe(-1);
  });

  it('computes the open string MIDI number, the scale tunings compare on', () => {
    expect(tunings[0]!.midi).toBe(40); // E2
    expect(tunings[1]!.midi).toBe(45); // A2
    expect(tunings[5]!.midi).toBe(63); // Eb4
  });

  it('carries forward to a later measure that declares nothing', () => {
    expect(part.getMeasure('2')!.getStaffTunings('2')).toHaveLength(6);
    expect(part.getMeasure('2')!.getStaffTunings()).toEqual([]); // staff 1 has none
  });
});
