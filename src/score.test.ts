import { describe, expect, it } from 'bun:test';
import { MElement } from './m-node';
import { Part } from './part';
import { Score } from './score';
import { MDOMParser } from './xml';

describe('Score', () => {
  const score = new Score();
  score.append(new MElement('part-list'));
  for (const id of ['P1', 'P2']) {
    const part = new Part();
    part.setAttribute('id', id);
    score.append(part);
  }

  it('lists only its parts, ignoring other children', () => {
    expect(score.parts.length).toBe(2);
  });

  it('finds a part by id', () => {
    expect(score.part('P2')?.id).toBe('P2');
  });

  it('returns null for an unknown part id', () => {
    expect(score.part('P9')).toBeNull();
  });
});

const HEADER_SAMPLE = `<score-partwise>
  <movement-title>Sonata</movement-title>
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
  const score = new MDOMParser().parseFromString(HEADER_SAMPLE).score!;

  it('reads the title, and each part its label and stave count', () => {
    expect(score.title).toBe('Sonata');
    expect(score.part('P1')!.label).toBe('Piano');
    expect(score.part('P1')!.staveCount).toBe(2);
  });
});
