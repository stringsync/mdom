import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// The one case where opener and closer really do share an onset: a `<grace/>`
// steals time from the note it leans on, so both sit at the same cursor position.
// Same-onset openers are skipped only while better candidates exist.
const GRACE_SLUR = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>1</divisions></attributes>
    <note><grace slash="yes"/><pitch><step>B</step><octave>3</octave></pitch><voice>1</voice>
      <notations><slur type="start"/></notations></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop"/></notations></note>
  </measure>
</part></score-partwise>`;

describe('spanner — an acciaccatura slur', () => {
  const part = new MDOMParser().parseFromString(GRACE_SLUR).score.getPart('P1')!;
  const [grace, main] = part.getMeasure('1')!.notes;

  it('pairs the grace note to its main note despite the shared onset', () => {
    expect(grace!.slurs[0]!.partner).toBe(main!.slurs[0]!);
  });
});
