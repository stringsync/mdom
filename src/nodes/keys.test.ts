import { describe, expect, test } from 'bun:test';

import { Document } from './document';
import { Entry } from './entry';
import { Measure } from './measure';
import { Mod } from './mod';
import { Part } from './part';
import { Stave } from './stave';
import { Voice } from './voice';

// A document with two of each level so keys must address a specific sibling,
// not just "the only one".
function tree() {
  const mod = new Mod();
  const entry = new Entry([new Mod(), mod]);
  const voice = new Voice([new Entry([]), entry]);
  const stave = new Stave([new Voice([]), voice]);
  const part = new Part([new Stave([]), stave]);
  const measure = new Measure([new Part([]), part]);
  const document = new Document([new Measure([]), measure]);
  return { document, measure, part, stave, voice, entry, mod };
}

// spec(mdom.keys): keys are stable, serializable addresses resolved through a
// single overloaded `at` on Document.
describe('keys', () => {
  // spec(mdom.keys): a node's key round-trips through `at` back to that node,
  // at every level of the hierarchy.
  test('at resolves each level back to the originating node', () => {
    const { document, measure, part, stave, voice, entry, mod } = tree();

    expect(document.at(measure.key())).toBe(measure);
    expect(document.at(part.key())).toBe(part);
    expect(document.at(stave.key())).toBe(stave);
    expect(document.at(voice.key())).toBe(voice);
    expect(document.at(entry.key())).toBe(entry);
    expect(document.at(mod.key())).toBe(mod);
  });

  // spec(mdom.keys): a deeper key is a superset of its ancestors, so the
  // deepest index present decides the level — a ModKey resolves to a Mod even
  // though it structurally satisfies every ancestor key.
  test('at dispatches on the deepest index, not the static shape', () => {
    const { document, mod } = tree();

    expect(document.at(mod.key())).toBeInstanceOf(Mod);
  });

  test('at returns undefined for an out-of-range key', () => {
    const { document } = tree();

    expect(document.at({ measureIndex: 99 })).toBeUndefined();
    expect(document.at({ measureIndex: 1, partIndex: 99 })).toBeUndefined();
    expect(
      document.at({ measureIndex: 1, partIndex: 1, staveIndex: 0, voiceIndex: 0, entryIndex: 0, modIndex: 99 })
    ).toBeUndefined();
  });

  // spec(mdom.keys): collection accessors per level, keyed by the parent.
  test('collection accessors return a level keyed by its parent', () => {
    const { document, measure, part, stave, voice, entry } = tree();

    expect(document.measures()).toHaveLength(2);
    expect(document.parts(measure.key())).toBe(measure.parts());
    expect(document.staves(part.key())).toBe(part.staves());
    expect(document.voices(stave.key())).toBe(stave.voices());
    expect(document.entries(voice.key())).toBe(voice.entries());
    expect(document.mods(entry.key())).toBe(entry.mods());
  });

  // spec(mdom.keys): keys survive serialization, making them suitable for
  // cursors, selections, annotations, and diffs against a re-parsed document.
  test('a key still resolves after a JSON round-trip', () => {
    const { document, mod } = tree();

    const revived = JSON.parse(JSON.stringify(mod.key()));

    expect(document.at(revived)).toBe(mod);
  });
});
