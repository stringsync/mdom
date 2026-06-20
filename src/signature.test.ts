import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './xml';
import { appliesToStaff, attributesBackFrom, divisionsBackFrom } from './signature';

// m1 declares a leading <attributes> (divisions 4) and a SECOND mid-measure
// <attributes> (divisions 8) after the first note — a divisions change partway
// through. m2 is bare, so any signature there is carried forward from m1.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>2</fifths><mode>major</mode></key>
        <time><beats>3</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>12</duration><staff>1</staff></note>
      <attributes>
        <divisions>8</divisions>
      </attributes>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>24</duration><staff>1</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>24</duration><staff>1</staff></note>
    </measure>
  </part>
</score-partwise>`;

describe('signature helpers — the backward carry-forward walk', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;
  const measure1 = part.measure('1')!;
  const measure2 = part.measure('2')!;

  it('returns <attributes> in effect nearest-first, scanning back from a note index', () => {
    // The first note sits at index 1 (the leading <attributes> is index 0), so its
    // own index excludes the mid-measure block that comes after it.
    const firstNote = measure1.notes[0]!;
    const fromFirstNote = attributesBackFrom(measure1, measure1.children.indexOf(firstNote));
    expect(fromFirstNote.map((attrs) => attrs.child('divisions')!.text)).toEqual(['4']);
  });

  it('bounds the in-measure scan by fromIndex — children.length sees later/mid-measure blocks', () => {
    // children.length scans the whole measure: the mid-measure block (divisions 8)
    // comes back first, then the leading block (divisions 4) — nearest-first.
    const fromMeasureEnd = attributesBackFrom(measure1, measure1.children.length);
    expect(fromMeasureEnd.map((attrs) => attrs.child('divisions')!.text)).toEqual(['8', '4']);
  });

  it('walks into earlier measures, current measure before earlier ones', () => {
    // From the start of the bare m2 (fromIndex 0): nothing in-measure, so the walk
    // crosses into m1 and returns both of its <attributes>, latest-first.
    const fromMeasure2 = attributesBackFrom(measure2, 0);
    expect(fromMeasure2.map((attrs) => attrs.child('divisions')!.text)).toEqual(['8', '4']);
  });

  it('carries <divisions> across a bare measure', () => {
    // m2 declares no <divisions>; the in-effect value is m1's most recent (8).
    expect(divisionsBackFrom(measure2, 0)).toBe(8);
    // Within m1, before the mid-measure change, divisions is still the leading 4.
    const firstNoteIndex = measure1.children.indexOf(measure1.notes[0]!);
    expect(divisionsBackFrom(measure1, firstNoteIndex)).toBe(4);
  });

  it('returns null divisions when no <attributes> declares it', () => {
    // From index 0 of m1, the scan starts before the leading block, finding nothing.
    expect(divisionsBackFrom(measure1, 0)).toBeNull();
  });

  it('applies a numberless element to ANY staff', () => {
    // The leading <time> has no number attribute, so it governs every staff.
    const leadingAttributes = measure1.childrenNamed('attributes')[0]!;
    const time = leadingAttributes.child('time')!;
    expect(time.getAttribute('number')).toBeNull();
    expect(appliesToStaff(time, '1')).toBe(true);
    expect(appliesToStaff(time, '2')).toBe(true);
  });

  it('applies a numbered element only to its own staff', () => {
    // A numbered <staff-details number="2"> applies to staff 2 alone.
    const staffDetails = new MDOMParser().parseFromString(
      `<staff-details number="2"><staff-lines>5</staff-lines></staff-details>`
    ).root;
    expect(staffDetails.getAttribute('number')).toBe('2');
    expect(appliesToStaff(staffDetails, '2')).toBe(true);
    expect(appliesToStaff(staffDetails, '1')).toBe(false);
  });
});
