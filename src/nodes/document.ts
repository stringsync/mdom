import type { Entry } from './entry';
import type { EntryKey, MeasureKey, ModKey, PartKey, StaveKey, VoiceKey } from './keys';
import type { Measure } from './measure';
import type { Mod } from './mod';
import type { Part } from './part';
import type { Stave } from './stave';
import type { Voice } from './voice';

// spec(mdom.navigation): the Document is the graph root; it has no parent and
// document() returns itself so the root is reachable from anywhere.
export class Document {
  constructor(private readonly measureNodes: Measure[]) {
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.measureNodes.forEach((measure, index) => measure.attach(this, index));
  }

  document(): Document {
    return this;
  }

  // spec(mdom.keys): resolution goes through a single overloaded `at`, not a
  // matrix of per-level getters. Overloads are ordered most-specific first so a
  // ModKey (a structural superset of every ancestor key) resolves to a Mod
  // rather than collapsing into the widest MeasureKey overload.
  at(key: ModKey): Mod | undefined;
  at(key: EntryKey): Entry | undefined;
  at(key: VoiceKey): Voice | undefined;
  at(key: StaveKey): Stave | undefined;
  at(key: PartKey): Part | undefined;
  at(key: MeasureKey): Measure | undefined;
  at(key: MeasureKey | PartKey | StaveKey | VoiceKey | EntryKey | ModKey) {
    // spec(mdom.keys): a deeper key is a superset of its ancestors, so drill
    // down through the hierarchy and stop at the deepest index present.
    const measure = this.measureNodes.at(key.measureIndex);
    if (!measure || !('partIndex' in key)) {
      return measure;
    }
    const part = measure.parts().at(key.partIndex);
    if (!part || !('staveIndex' in key)) {
      return part;
    }
    const stave = part.staves().at(key.staveIndex);
    if (!stave || !('voiceIndex' in key)) {
      return stave;
    }
    const voice = stave.voices().at(key.voiceIndex);
    if (!voice || !('entryIndex' in key)) {
      return voice;
    }
    const entry = voice.entries().at(key.entryIndex);
    if (!entry || !('modIndex' in key)) {
      return entry;
    }
    return entry.mods().at(key.modIndex);
  }

  // spec(mdom.keys): collection accessors per level — each takes the parent key
  // and returns that level's children, mirroring the key hierarchy.
  measures(): Measure[] {
    return this.measureNodes;
  }

  parts(key: MeasureKey): Part[] | undefined {
    return this.at(key)?.parts();
  }

  staves(key: PartKey): Stave[] | undefined {
    return this.at(key)?.staves();
  }

  voices(key: StaveKey): Voice[] | undefined {
    return this.at(key)?.voices();
  }

  entries(key: VoiceKey): Entry[] | undefined {
    return this.at(key)?.entries();
  }

  mods(key: EntryKey): Mod[] | undefined {
    return this.at(key)?.mods();
  }
}
