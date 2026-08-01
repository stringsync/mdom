import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// <sound> appears inside a <direction> AND as a direct <measure> child, with the
// same meaning — here both spellings, plus a swing instruction and the
// <straight/> that cancels it.
const SAMPLE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions></attributes>
    <direction><direction-type><words>Swing</words></direction-type>
      <sound tempo="132" dynamics="80">
        <swing><first>2</first><second>1</second><swing-type>eighth</swing-type></swing>
      </sound>
    </direction>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
    <sound tempo="90"/>
  </measure>
  <measure number="2">
    <direction><direction-type><words>Straight</words></direction-type>
      <sound><swing><straight/><swing-type>16th</swing-type></swing></sound>
    </direction>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
  </measure>
</part></score-partwise>`;

describe('sound — merged from the direction and the measure', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const [first, second] = part.measures;

  it('merges the directions sounds, then the measure own standalone child', () => {
    expect(first!.sounds.map((sound) => sound.tempo)).toEqual([132, 90]);
    expect(first!.directions[0]!.sound?.tempo).toBe(132);
    expect(first!.directions[0]!.soundTempo).toBe(132); // the old accessor still works
  });

  it('reads the playback dynamics, null when unset', () => {
    expect(first!.sounds[0]!.dynamics).toBe(80);
    expect(first!.sounds[1]!.dynamics).toBeNull();
  });

  it('reads the swing ratio and the note value it divides', () => {
    expect(first!.sounds[0]!.swing).toEqual({ first: 2, second: 1, unit: 0.5 });
    expect(first!.sounds[1]!.swing).toBeNull(); // no <swing> at all
  });

  it('reads <straight/> as an even 1:1, so it cancels a carried swing', () => {
    expect(second!.sounds[0]!.swing).toEqual({ first: 1, second: 1, unit: 0.25 });
  });
});
