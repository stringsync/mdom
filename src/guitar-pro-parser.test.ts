import { beforeEach, describe, expect, it } from 'bun:test';
import { GuitarProParser } from './guitar-pro-parser';
import { schemaErrors } from './music-xml-schema';

// webappwiz/system Fs reads text only; these fixtures must be read as binary Blobs.
describe('GuitarProParser', () => {
  let parser: GuitarProParser;

  beforeEach(() => {
    parser = new GuitarProParser();
  });

  it('reads pitches, rests and durations from an independent Guitar Pro file', async () => {
    const doc = await parser.parseFromBlob(Bun.file(new URL('../fixtures/guitar-pro/notes.gp', import.meta.url)));
    const notes = doc.score.parts[0]!.measures[0]!.notes;

    expect(
      notes.slice(0, 5).map((note) => [note.pitch?.step, note.pitch?.alter, note.pitch?.octave, note.isRest])
    ).toEqual([
      ['F', 0, 2, false],
      ['F', 1, 2, false],
      ['G', 0, 2, false],
      ['G', 1, 2, false],
      [undefined, undefined, undefined, true],
    ]);
    expect(notes.filter((note) => note.isRest).map((note) => [note.type, note.beats])).toEqual([
      ['whole', 4],
      ['half', 2],
      ['quarter', 1],
      ['eighth', 0.5],
      ['16th', 0.25],
      ['32nd', 0.125],
      ['64th', 0.0625],
    ]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('keeps string numbering, frets and tuning from an independent chord fixture', async () => {
    const doc = await parser.parseFromBlob(Bun.file(new URL('../fixtures/guitar-pro/strings.gp', import.meta.url)));
    const measure = doc.score.parts[0]!.measures[0]!;

    expect(measure.notes.slice(0, 6).map((note) => [note.string, note.fret, note.measureBeat])).toEqual([
      [1, 1, 0],
      [2, 2, 0],
      [3, 3, 0],
      [4, 4, 0],
      [5, 5, 0],
      [6, 6, 0],
    ]);
    expect(measure.getStaffTunings().map((tuning) => [tuning.line, tuning.midi])).toEqual([
      [1, 40],
      [2, 45],
      [3, 50],
      [4, 55],
      [5, 59],
      [6, 64],
    ]);
    expect(measure.notes.at(-1)).toMatchObject({ isRest: true, beats: 3, dots: 1 });
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('keeps tuplet ratios and exact onsets from an independent fixture', async () => {
    const doc = await parser.parseFromBlob(Bun.file(new URL('../fixtures/guitar-pro/tuplets.gp', import.meta.url)));
    const measure = doc.score.parts[0]!.measures[0]!;

    expect(measure.notes.map((note) => note.measureBeat)).toEqual([0, 2 / 3, 4 / 3, 2]);
    expect(measure.notes.slice(0, 3).map((note) => note.timeModification)).toEqual([
      { actual: 3, normal: 2 },
      { actual: 3, normal: 2 },
      { actual: 3, normal: 2 },
    ]);
    expect(measure.notes.map((note) => note.duration)).toEqual([512, 512, 512, 1536]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('reads score metadata and multiple tracks', async () => {
    const doc = await parser.parseFromBlob(Bun.file(new URL('../fixtures/guitar-pro/score-info.gp', import.meta.url)));

    expect(doc.score.title).toBe('Title');
    expect(doc.score.parts.map((part) => part.label)).toEqual(['Track 1', 'Track 2']);
    expect(
      doc.score
        .child('identification')
        ?.childrenNamed('creator')
        .map((creator) => [creator.getAttribute('type'), creator.text])
    ).toEqual([
      ['composer', 'Music'],
      ['lyricist', 'Words'],
      ['artist', 'Artist'],
    ]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('reads changing meters without flattening the denominator', async () => {
    const doc = await parser.parseFromBlob(
      Bun.file(new URL('../fixtures/guitar-pro/time-signatures.gp', import.meta.url))
    );

    expect(
      doc.score.parts[0]!.measures.map((measure) => [measure.getTime()?.beats, measure.getTime()?.beatType])
    ).toEqual([
      ['4', '4'],
      ['3', '4'],
      ['2', '4'],
      ['1', '4'],
      ['20', '32'],
      ['20', '32'],
    ]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('reads major and minor key changes', async () => {
    const doc = await parser.parseFromBlob(
      Bun.file(new URL('../fixtures/guitar-pro/key-signatures.gp', import.meta.url))
    );
    const measures = doc.score.parts[0]!.measures;

    expect(measures.slice(0, 4).map((measure) => [measure.getKey()?.fifths, measure.getKey()?.mode])).toEqual([
      [0, 'major'],
      [-1, 'major'],
      [-2, 'major'],
      [-3, 'major'],
    ]);
    expect(measures.slice(16, 20).map((measure) => [measure.getKey()?.fifths, measure.getKey()?.mode])).toEqual([
      [0, 'minor'],
      [-1, 'minor'],
      [-2, 'minor'],
      [-3, 'minor'],
    ]);
  });

  it('keeps pickup measures short', async () => {
    const doc = await parser.parseFromBlob(Bun.file(new URL('../fixtures/guitar-pro/anacrusis.gp', import.meta.url)));

    expect(doc.score.parts[0]!.measures.map((measure) => [measure.isImplicit, measure.endBeat])).toEqual([
      [true, 2],
      [false, 4],
    ]);
  });

  it('reads an empty GP8 bar as a full-measure rest', async () => {
    const doc = await parser.parseFromBlob(Bun.file(new URL('../fixtures/guitar-pro/hide-tuning.gp', import.meta.url)));

    expect(doc.score.parts[0]!.label).toBe('Steel Guitar');
    expect(doc.score.parts[0]!.measures[0]!.notes).toHaveLength(1);
    expect(doc.score.parts[0]!.measures[0]!.notes[0]).toMatchObject({ isRest: true, beats: 4 });
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('reads repeat counts from an independent fixture', async () => {
    const doc = await parser.parseFromBlob(
      Bun.file(new URL('../fixtures/guitar-pro/repeat-close.gp', import.meta.url))
    );

    expect(
      doc.score.parts[0]!.measures.flatMap((measure) => measure.barlines.map((line) => [line.repeat, line.repeatTimes]))
    ).toEqual([
      ['forward', null],
      ['backward', 2],
    ]);
  });

  it('rejects techniques outside the supported subset', async () => {
    await expect(
      parser.parseFromBlob(Bun.file(new URL('../fixtures/guitar-pro/grace.gp', import.meta.url)))
    ).rejects.toThrow('note techniques');
  });

  it('retains grace timing when unsupported techniques are explicitly omitted', async () => {
    const doc = await parser.parseFromBlob(Bun.file(new URL('../fixtures/guitar-pro/grace.gp', import.meta.url)), {
      unsupported: 'omit',
    });
    const notes = doc.score.parts[0]!.measures[0]!.notes;

    expect(notes.map((note) => note.isGrace)).toEqual([true, false, true, false, false]);
    expect(notes.filter((note) => note.isGrace).map((note) => note.duration)).toEqual([null, null]);
    expect(schemaErrors(doc)).toEqual([]);
  });
});
