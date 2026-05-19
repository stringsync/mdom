import type { EntryKey, MeasureKey, ModKey, PartKey, StaveKey, VoiceKey } from './keys';
import type { Measure } from './measure';

// spec(mdom.navigation): the Document is the graph root; it has no parent and
// document() returns itself so the root is reachable from anywhere.
export class Document {
  constructor(private readonly measures: Measure[]) {
    // spec(mdom.navigation): wire each child's back-reference to this node.
    this.measures.forEach((measure, index) => measure.attach(this, index));
  }

  document(): Document {
    return this;
  }

  getMeasures() {
    return this.measures;
  }

  getMeasure(key: MeasureKey) {
    return this.getMeasures().at(key.measureIndex);
  }

  getParts(key: MeasureKey) {
    return this.getMeasure(key)?.getParts();
  }

  getPart(key: PartKey) {
    return this.getParts(key)?.at(key.partIndex);
  }

  getStaves(key: PartKey) {
    return this.getPart(key)?.getStaves();
  }

  getStave(key: StaveKey) {
    return this.getStaves(key)?.at(key.staveIndex);
  }

  getVoices(key: StaveKey) {
    return this.getStave(key)?.getVoices();
  }

  getVoice(key: VoiceKey) {
    return this.getVoices(key)?.at(key.voiceIndex);
  }

  getEntries(key: VoiceKey) {
    return this.getVoice(key)?.getEntries();
  }

  getEntry(key: EntryKey) {
    return this.getEntries(key)?.at(key.entryIndex);
  }

  getMods(key: EntryKey) {
    return this.getEntry(key)?.getMods();
  }

  getMod(key: ModKey) {
    return this.getMods(key)?.at(key.modIndex);
  }
}
