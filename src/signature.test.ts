import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import { MusicXMLSerializer } from './music-xml-serializer';
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
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const measure1 = part.getMeasure('1')!;
  const measure2 = part.getMeasure('2')!;

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

// A two-staff part that declares its signatures in measure 1, changes the lower
// staff's clef in measure 3, and states nothing in measures 2 and 4 — the shape
// every slice and every inserted spacer measure has to cope with.
const SCORE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions><staves>2</staves>
      <key><fifths>2</fifths><mode>major</mode></key>
      <time><beats>3</beats><beat-type>4</beat-type></time>
      <clef number="1"><sign>G</sign><line>2</line></clef>
      <clef number="2"><sign>F</sign><line>4</line></clef>
    </attributes>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="2">
    <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="3">
    <attributes><clef number="2"><sign>C</sign><line>3</line></clef></attributes>
    <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="4">
    <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
</part></score-partwise>`;

function parse() {
  const document = new MDOMParser().parseFromString(SCORE);
  return { document, part: document.score.getPart('P1')! };
}

describe('measure — materializeSignatures makes a measure renderable alone', () => {
  it('writes the carried signatures in, nearest declaration winning per staff', () => {
    const { part } = parse();
    const last = part.getMeasure('4')!;
    last.materializeSignatures();

    expect(last.childrenNamed('attributes')).toHaveLength(1);
    expect(last.getKey()?.fifths).toBe(2);
    expect(last.getTime()?.beats).toBe('3');
    expect(last.getClef('1')?.sign).toBe('G');
    expect(last.getClef('2')?.sign).toBe('C'); // measure 3's change, not measure 1's F
  });

  it('survives dropping every earlier measure — the slice operation', () => {
    const { part } = parse();
    const last = part.getMeasure('4')!;
    last.materializeSignatures();
    for (const measure of part.measures.filter((candidate) => candidate !== last)) {
      measure.remove();
    }

    expect(part.measures).toHaveLength(1);
    expect(last.getClef('2')?.sign).toBe('C');
    expect(last.getKey()?.fifths).toBe(2);
    expect(last.notes[0]!.divisions).toBe(4);
    expect(last.staveCount).toBe(2);
  });

  it('keeps the block in schema order, positioned before the note, and is idempotent', () => {
    const { document, part } = parse();
    const last = part.getMeasure('4')!;
    last.materializeSignatures();

    const attrs = last.childrenNamed('attributes')[0]!;
    expect(attrs.childrenOfType(MElement).map((child) => child.tag)).toEqual([
      'divisions',
      'key',
      'time',
      'staves',
      'clef',
      'clef',
    ]);
    expect(last.children.indexOf(attrs)).toBeLessThan(last.children.indexOf(last.notes[0]!));
    expect(new MusicXMLSerializer().serializeToString(document)).toContain('<clef number="2">');

    const size = attrs.children.length;
    last.materializeSignatures();
    expect(last.childrenNamed('attributes')[0]!.children).toHaveLength(size);
  });

  it('never overwrites what the measure already declares', () => {
    const { part } = parse();
    const third = part.getMeasure('3')!;
    third.materializeSignatures();

    // Its own <clef number="2"> stays; staff 1's is carried in beside it.
    expect(third.getClef('2')?.sign).toBe('C');
    expect(third.getClef('1')?.sign).toBe('G');
    expect(third.childrenNamed('attributes')).toHaveLength(1);
  });
});

describe('part — insertMeasureAt + copySignaturesFrom for a spacer measure', () => {
  it('inserts at an index, leaving numbering to the caller', () => {
    const { part } = parse();
    const gap = part.insertMeasureAt(0);

    expect(part.measures[0]).toBe(gap);
    expect(part.measures).toHaveLength(5);
    expect(gap.getAttribute('number')).toBeNull();
    expect(part.insertMeasureAt(5, { number: 'X' }).number).toBe('X');
  });

  it('gives a gap inserted before every declaration a stave to draw', () => {
    const { part } = parse();
    const displaced = part.getMeasure('1')!;
    const gap = part.insertMeasureAt(0);
    // Nothing precedes the gap, so carry-forward alone leaves it bare.
    expect(gap.getClef('1')).toBeNull();

    gap.copySignaturesFrom(displaced);
    expect(gap.getClef('1')?.sign).toBe('G');
    expect(gap.getClef('2')?.sign).toBe('F');
    expect(gap.getKey()?.fifths).toBe(2);
    expect(gap.getTime()?.beats).toBe('3');
    expect(gap.staveCount).toBe(2);
  });
});
