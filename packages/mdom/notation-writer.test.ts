import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import type { Measure } from './measure';
import { MusicXMLSerializer } from './music-xml-serializer';
import { schemaErrors } from './music-xml-schema';

/** A one-part document plus a first measure carrying divisions, clef and time. */
const build = (): { doc: MDocument; measure: Measure } => {
  const doc = MDocument.empty();
  const measure = doc.score.addPart({ id: 'P1', name: 'Guitar' }).addMeasure();
  measure.setDivisions(4);
  measure.setClef({ sign: 'G', line: 2 });
  measure.setTime({ beats: 4, beatType: 4 });
  return { doc, measure };
};

const serialize = (doc: MDocument): string => new MusicXMLSerializer().serializeToString(doc);

describe('measure and note — writing common notation', () => {
  it('writes a chord symbol with a fretboard diagram', () => {
    const { doc, measure } = build();
    const harmony = measure.addHarmony({
      root: { step: 'B', alter: -1 },
      kind: { value: 'major-seventh', text: 'maj7' },
      bass: { step: 'D' },
      frame: {
        strings: 6,
        frets: 4,
        firstFret: 6,
        notes: [
          { string: 5, fret: 1, barre: 'start' },
          { string: 1, fret: 1, barre: 'stop' },
        ],
      },
    });
    measure.getOrCreateVoice('1').addNote({ step: 'B', octave: 3, type: 'whole' });

    expect(harmony.root).toEqual({ step: 'B', alter: -1 });
    expect(harmony.kind).toEqual({ value: 'major-seventh', text: 'maj7' });
    expect(harmony.bass).toEqual({ step: 'D', alter: null });
    expect(harmony.frame?.firstFret).toBe(6);
    expect(harmony.frame?.frameNotes.map((note) => [note.string, note.fret, note.barre])).toEqual([
      [5, 1, 'start'],
      [1, 1, 'stop'],
    ]);
    expect(harmony.nextNote).toBe(measure.notes[0]!);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('writes repeat barlines and a volta bracket on the edges they draw on', () => {
    const { doc, measure } = build();
    measure.addBarline({ location: 'left', barStyle: 'heavy-light', repeat: { direction: 'forward' } });
    measure.addBarline({ location: 'left', ending: { type: 'start', number: '1' } });
    measure.getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'whole' });
    measure.addBarline({
      barStyle: 'light-heavy',
      ending: { type: 'stop', number: '1' },
      repeat: { direction: 'backward', times: 3 },
    });

    const [left, ending, right] = measure.barlines;
    expect(left!.location).toBe('left');
    expect(left!.repeat).toBe('forward');
    expect(ending!.ending).toEqual({ type: 'start', number: '1' });
    expect(right!.location).toBe('right'); // the MusicXML default, so it is not written out
    expect(right!.barStyle).toBe('light-heavy');
    expect(right!.repeatTimes).toBe(3);
    // A left barline lands first even though it was written after `setDivisions`.
    expect(measure.children.indexOf(left!)).toBe(0);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('writes a dotted metronome mark, its playback tempo, and an expression', () => {
    const { doc, measure } = build();
    const tempo = measure.addDirection({
      metronome: { beatUnit: 'quarter', dots: 1, perMinute: 120, parentheses: true },
      words: { text: 'Swing', fontStyle: 'italic', fontWeight: 'bold' },
      tempo: 180,
      placement: 'above',
    });
    const dynamic = measure.addDirection({ dynamics: ['sf', 'p'], placement: 'below' });
    measure.getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'whole' });

    expect(tempo.metronomes[0]!.beatUnits).toEqual([{ type: 'quarter', dots: 1 }]);
    expect(tempo.metronomes[0]!.perMinute).toBe('120');
    expect(tempo.metronomes[0]!.parentheses).toBe(true);
    expect(tempo.words).toEqual(['Swing']);
    expect(tempo.wordsElements[0]!.fontStyle).toBe('italic');
    expect(tempo.soundTempo).toBe(180);
    expect(tempo.placement).toBe('above');
    expect(dynamic.dynamics[0]!.marks).toEqual(['sf', 'p']);
    // The dot TRAILS the unit it modifies — the positional reading Metronome does.
    expect(serialize(doc)).toContain('<beat-unit>quarter</beat-unit>\n            <beat-unit-dot/>');
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('refuses a direction with nothing printable on it', () => {
    const { measure } = build();
    expect(() => measure.addDirection({ tempo: 90 })).toThrow(
      'a <direction> needs at least one of metronome, words or dynamics'
    );
  });

  it('writes articulations, gathering them into one <articulations> block', () => {
    const { doc, measure } = build();
    const note = measure.getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'whole' });
    note.addArticulation('staccato');
    note.addArticulation('accent');

    expect(note.articulations).toEqual(['staccato', 'accent']);
    expect(note.childrenNamed('notations')[0]!.childrenNamed('articulations')).toHaveLength(1);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('upserts a diagram onto a harmony that already has one', () => {
    const { doc, measure } = build();
    const harmony = measure.addHarmony({ root: { step: 'E' }, kind: 'minor' });
    harmony.setFrame({ notes: [{ string: 6, fret: 0 }] });
    harmony.setFrame({ strings: 4, frets: 5, notes: [{ string: 4, fret: 2 }] });
    measure.getOrCreateVoice('1').addNote({ step: 'E', octave: 3, type: 'whole' });

    expect(measure.frames).toHaveLength(1);
    expect(harmony.frame?.strings).toBe(4);
    expect(harmony.frame?.frameNotes.map((note) => note.fret)).toEqual([2]);
    expect(schemaErrors(doc)).toEqual([]);
  });
});
