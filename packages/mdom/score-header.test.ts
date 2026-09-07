import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { Score } from './score';

// Everything a reader wants before a note is drawn: the movement title, each
// part's label and stave count, and the encoding <software> that names the
// exporter whose quirks the rest of the suite works around.
const HEADER = `<score-partwise>
  <movement-title>Sonata</movement-title>
  <identification>
    <encoding>
      <software>Finale 2011 for Windows</software>
      <software>Dolet 5.5 for Finale</software>
      <encoding-date>2010-12-10</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><staves>2</staves></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('score header', () => {
  const score = new MDOMParser().parseFromString(HEADER).score;

  it('reads the title, and each part its label and stave count', () => {
    expect(score.title).toBe('Sonata');
    expect(score.getPart('P1')!.label).toBe('Piano');
    expect(score.getPart('P1')!.staveCount).toBe(2);
  });

  it('lists every encoding <software>, in order', () => {
    expect(score.software).toEqual(['Finale 2011 for Windows', 'Dolet 5.5 for Finale']);
  });

  it('names no software when the file states none', () => {
    expect(new Score().software).toEqual([]);
  });
});
