import { describe, expect, it } from 'bun:test';
import { MElement, MText } from './m-node';
import { Pitch } from './pitch';

function leaf(tag: string, text: string): MElement {
  const el = new MElement(tag);
  el.append(new MText(text));
  return el;
}

describe('Pitch', () => {
  it('reads step, alter, and octave', () => {
    const pitch = new Pitch();
    pitch.append(leaf('step', 'C'));
    pitch.append(leaf('alter', '1'));
    pitch.append(leaf('octave', '4'));
    expect(pitch.step).toBe('C');
    expect(pitch.alter).toBe(1);
    expect(pitch.octave).toBe(4);
  });

  it('parses a flat as a negative alter', () => {
    const pitch = new Pitch();
    pitch.append(leaf('alter', '-1'));
    expect(pitch.alter).toBe(-1);
  });

  it('parses a microtonal alter as a decimal', () => {
    const pitch = new Pitch();
    pitch.append(leaf('alter', '0.5'));
    expect(pitch.alter).toBe(0.5);
  });

  it('defaults a missing alter to natural (0)', () => {
    const pitch = new Pitch();
    expect(pitch.alter).toBe(0);
  });

  it('throws a located error for a malformed pitch missing step/octave', () => {
    const pitch = new Pitch();
    expect(() => pitch.step).toThrow('<step> in <pitch>');
    expect(() => pitch.octave).toThrow('<octave> in <pitch>');
  });
});
