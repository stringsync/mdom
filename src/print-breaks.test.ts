import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// new-system has three states, and "no" is a positive statement — the document
// laid this line out, so squeeze rather than wrap. It must not read as silence.
const BREAKS = `<score-partwise><part id="P1">
  <measure number="1"><print new-system="yes" new-page="yes"/>
    <attributes><divisions>4</divisions></attributes>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note></measure>
  <measure number="2"><print new-system="no"/>
    <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note></measure>
  <measure number="3"><print/>
    <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration></note></measure>
</part></score-partwise>`;

describe('print — the break flags as a tri-state', () => {
  const part = new MDOMParser().parseFromString(BREAKS).score.getPart('P1')!;
  const [breaking, staying, silent] = part.measures.map((measure) => measure.print!);

  it('keeps yes, no and absent distinct', () => {
    expect(breaking!.systemBreak).toBe('yes');
    expect(staying!.systemBreak).toBe('no');
    expect(silent!.systemBreak).toBeNull();
  });

  it('does the same for the page break', () => {
    expect(breaking!.pageBreak).toBe('yes');
    expect(staying!.pageBreak).toBeNull();
  });

  it('leaves the boolean accessors reading as before', () => {
    expect(breaking!.newSystem).toBe(true);
    expect(staying!.newSystem).toBe(false);
    expect(silent!.newSystem).toBe(false);
  });
});
