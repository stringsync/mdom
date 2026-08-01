import { describe, expect, it } from 'bun:test';
import { LineDetail } from './line-detail';
import { MDOMParser } from './m-dom-parser';
import { StaffDetails } from './staff-details';
import { StaffTuning } from './staff-tuning';

// A notation+tab part as Guitar Pro writes it: staff 1 gets the guitar's tunings
// copied onto it with NO <staff-lines>, staff 2 is the real tab staff.
const TAB = `
<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes>
        <staves>2</staves>
        <staff-details number="1">
          <staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
        </staff-details>
        <staff-details number="2" print-object="no">
          <staff-lines>6</staff-lines>
          <staff-size>80</staff-size>
          <show-frets>letters</show-frets>
          <capo>2</capo>
          <line-detail line="1" width="0.5"/>
          <staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
          <staff-tuning line="2"><tuning-step>A</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
        </staff-details>
      </attributes>
    </measure>
    <measure number="2"/>
  </part>
</score-partwise>`;

describe('StaffDetails', () => {
  const part = new MDOMParser().parseFromString(TAB).score.getPart('P1')!;
  const tab = part.getMeasure('1')!.getStaffDetails('2')!;

  it('reads every declaration on the block', () => {
    expect(tab).toBeInstanceOf(StaffDetails);
    expect(tab.staffLines).toBe(6);
    expect(tab.staffSize).toBe(80);
    expect(tab.showFrets).toBe('letters');
    expect(tab.capo).toBe(2);
    expect(tab.printObject).toBe(false);
    expect(tab.lineDetails.map((detail) => detail.line)).toEqual([1]);
    expect(tab.lineDetails[0]).toBeInstanceOf(LineDetail);
    expect(tab.staffTunings.map((tuning) => tuning.line)).toEqual([1, 2]);
    expect(tab.staffTunings[0]).toBeInstanceOf(StaffTuning);
  });

  it('keeps an undeclared <staff-lines> distinct from the 5-line default', () => {
    const notation = part.getMeasure('1')!.getStaffDetails('1')!;
    expect(notation.staffLines).toBeNull(); // the tunings here are spurious
    expect(part.getMeasure('1')!.getStaveLines('1')).toBe(5);
    expect(notation.staffSize).toBeNull();
    expect(notation.showFrets).toBeNull();
    expect(notation.capo).toBeNull();
    expect(notation.printObject).toBe(true);
    expect(notation.lineDetails).toEqual([]);
  });

  it('carries forward to later measures, and is null when none applies', () => {
    expect(part.getMeasure('2')!.getStaffDetails('2')?.staffLines).toBe(6);
    expect(part.getMeasure('1')!.getStaffDetails('3')).toBeNull();
  });
});
