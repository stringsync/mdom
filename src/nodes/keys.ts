export type MeasureKey = {
  measureIndex: number;
};

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
