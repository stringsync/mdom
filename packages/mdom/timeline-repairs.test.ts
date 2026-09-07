import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';

describe('timeline — repairs that have nothing to move', () => {
  const build = () => {
    const part = MDocument.empty().score.addPart({ id: 'P1' });
    const voice = part.addMeasure().getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
    return { part, voice };
  };

  it('is a no-op when the duration does not actually change', () => {
    const { voice } = build();
    const before = voice.notes.map((note) => note.measureBeat);
    voice.notes[0]!.setDuration({ type: 'quarter' });
    expect(voice.notes.map((note) => note.measureBeat)).toEqual(before);
  });

  it('ripples the rest of the voice when there is no sibling voice to anchor', () => {
    const { voice } = build();
    voice.notes[0]!.setDuration({ type: 'half' });
    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 2]);
  });

  it('changes only the notation for a grace note, which carries no duration', () => {
    const { voice } = build();
    const grace = voice.notes[1]!;
    grace.convertToGrace();
    expect(grace.isGrace).toBe(true);
    expect(grace.duration).toBeNull();
    grace.setDuration({ type: '16th', dots: 1 });
    expect(grace.type).toBe('16th');
    expect(grace.dots).toBe(1);
    expect(grace.duration).toBeNull();
  });
});
