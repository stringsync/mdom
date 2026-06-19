import { describe, expect, it } from 'bun:test';
import { MElement, MText } from './m-node';
import { Pitch } from './pitch';

// Pitch reads nested <step>/<alter>/<octave> text; build those leaves directly.
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

  it('returns null for absent step, alter, and octave', () => {
    const pitch = new Pitch();
    expect(pitch.step).toBeNull();
    expect(pitch.alter).toBeNull();
    expect(pitch.octave).toBeNull();
  });
});
