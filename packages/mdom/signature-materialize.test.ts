import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import { MusicXMLSerializer } from './music-xml-serializer';

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
