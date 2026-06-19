import { describe, expect, it } from 'bun:test';
import { MElement } from './m-node';
import { Measure } from './measure';
import { Note } from './note';

describe('Measure', () => {
  it('exposes its number', () => {
    const measure = new Measure();
    measure.setAttribute('number', '4');
    expect(measure.number).toBe('4');
  });

  it('has a null number when unset', () => {
    expect(new Measure().number).toBeNull();
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
});
