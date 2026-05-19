// spec(mdom.keys): keys are stable, serializable addresses — plain index
// records with no node references, so they survive JSON round-trips and stay
// valid as cursors, selections, and diffs against a re-parsed document.
export type MeasureKey = {
  measureIndex: number;
};

// spec(mdom.keys): each key extends the one above it, so a deeper key is a
// superset of its ancestors.
export type PartKey = MeasureKey & {
  partIndex: number;
};

export type StaveKey = PartKey & {
  staveIndex: number;
};

export type VoiceKey = StaveKey & {
  voiceIndex: number;
};

export type EntryKey = VoiceKey & {
  entryIndex: number;
};

export type ModKey = EntryKey & {
  modIndex: number;
};
