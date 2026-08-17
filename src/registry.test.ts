import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { cloneElement, elementFor } from './registry';
import { Clef } from './clef';
import { Technical } from './technical';

describe('registry — cloning keeps the typed classes', () => {
  it('rebuilds a subtree that answers the same typed queries', () => {
    const source = new MDOMParser().parseFromString(
      `<attributes><clef number="2"><sign>F</sign><line>4</line></clef></attributes>`
    ).root;
    const copy = cloneElement(source);

    expect(copy).not.toBe(source);
    expect(copy.childrenOfType(Clef)[0]).toBeInstanceOf(Clef);
    expect(copy.childrenOfType(Clef)[0]!.sign).toBe('F');
    expect(copy.childrenOfType(Clef)[0]!.staff).toBe('2');
    expect(copy.childrenOfType(Clef)[0]!.line).toBe(4);
    expect(copy.parent).toBeNull(); // detached
  });

  it('falls back to a plain element for an unmodeled tag, which still round-trips', () => {
    const exotic = elementFor('some-future-tag');
    expect(exotic.constructor.name).toBe('MElement');
    expect(exotic.tag).toBe('some-future-tag');

    const copy = cloneElement(
      new MDOMParser().parseFromString('<wrapper attr="kept"><unknown>text</unknown></wrapper>').root
    );
    expect(copy.getAttribute('attr')).toBe('kept');
    expect(copy.child('unknown')?.text).toBe('text');
  });

  it('gives the tag-family classes the tag they were matched on', () => {
    const fingering = elementFor('fingering');
    expect(fingering).toBeInstanceOf(Technical);
    expect((fingering as Technical).technicalType).toBe('fingering');
    expect(elementFor('pluck').tag).toBe('pluck');
  });
});
