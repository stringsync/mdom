import { describe, expect, it } from 'bun:test';
import { MElement } from './m-node';
import { Measure } from './measure';
import { Note } from './note';
import { Part } from './part';

describe('Measure', () => {
  it('exposes its number', () => {
    const measure = new Measure();
    measure.setAttribute('number', '4');
    expect(measure.number).toBe('4');
  });

  it('throws when number is unset', () => {
    expect(() => new Measure().number).toThrow('number on <measure>');
  });

  it('lists only notes, ignoring other measure children', () => {
    const measure = new Measure();
    measure.append(new MElement('attributes'));
    measure.append(new Note());
    measure.append(new MElement('backup'));
    measure.append(new Note());
    expect(measure.notes.length).toBe(2);
  });

  it('lists no notes when empty', () => {
    expect(new Measure().notes.length).toBe(0);
  });

  it('reports its zero-based index within its part', () => {
    const part = new Part();
    const first = new Measure();
    const second = new Measure();
    part.append(first);
    part.append(second);
    expect(first.index).toBe(0);
    expect(second.index).toBe(1);
  });

  it('has index -1 when not in a part', () => {
    expect(new Measure().index).toBe(-1);
  });
});
