import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Score } from '../index';
import { EXAMPLES } from './examples';

// compatibility.test.ts proves the corpus round-trips; this proves it can be
// READ. Each suite below points a group of query accessors at the real exporter
// output that motivated them — a synthetic fragment can't show that Finale
// really does write 792 `new-system="no"` measures, or that LilyPond really does
// stack three elisions in one syllable.
const load = (file: string): Score =>
  new MDOMParser().parseFromString(fs.readFileSync(path.join(__dirname, 'examples', file), 'utf-8')).score;

describe('Finale + Dolet — a 22-part orchestral score', () => {
  const score = load(EXAMPLES.ACTOR_PRELUDE_SAMPLE);
  const measures = score.parts.flatMap((part) => part.measures);
  const notes = measures.flatMap((measure) => measure.notes);

  it('resolves the part-list brackets and braces, outermost first', () => {
    const groups = score.partGroups;
    expect(score.parts).toHaveLength(22);
    expect(groups[0]).toEqual({
      fromPartIndex: 0,
      toPartIndex: 6,
      symbol: 'bracket',
      name: null,
      abbreviation: null,
      barline: 'yes',
      depth: 0,
    });
    // An enclosing group always opens before the one it encloses, so start order
    // never puts a child ahead of its parent.
    expect(groups.every((group, index) => index === 0 || groups[index - 1]!.depth <= group.depth + 1)).toBe(true);
    expect(groups.some((group) => group.symbol === 'brace' && group.name === 'Horns in F')).toBe(true);
    expect(groups.some((group) => group.barline === 'no')).toBe(true); // absence is not the only non-'yes'
  });

  it('keeps new-system="no" distinct from an absent attribute', () => {
    // The whole reason the tri-state exists: this exporter states "stays on its
    // line" 792 times, which a boolean reads as identical to silence.
    const prints = measures.flatMap((measure) => (measure.print ? [measure.print] : []));
    expect(prints.filter((print) => print.systemBreak === 'no')).toHaveLength(792);
    expect(prints.filter((print) => print.systemBreak === 'yes')).toHaveLength(22);
    expect(prints.filter((print) => print.systemBreak === null)).toHaveLength(88);
    expect(prints.filter((print) => print.newSystem)).toHaveLength(22); // the boolean still agrees
  });

  it('finds the spacer notes that hold a tick but draw nothing', () => {
    expect(notes).toHaveLength(2945);
    expect(notes.filter((note) => !note.printObject)).toHaveLength(303);
  });

  it('reads percussion staff positions and open noteheads', () => {
    expect(notes.filter((note) => note.unpitched)).toHaveLength(237);
    expect(notes.find((note) => note.unpitched)?.unpitched).toEqual({ step: 'E', octave: 5 });
    expect(notes.filter((note) => note.notehead?.filled === false)).toHaveLength(13);
  });

  it('reads dynamics by tag and playback velocities off <sound>', () => {
    const marks = measures
      .flatMap((measure) => measure.directions)
      .flatMap((direction) => direction.dynamics)
      .flatMap((dynamics) => dynamics.marks);
    expect(marks.slice(0, 3)).toEqual(['p', 'f', 'ff']);
    expect(measures.flatMap((measure) => measure.sounds).filter((sound) => sound.dynamics != null)).toHaveLength(228);
  });

  it('reads the tempo mark in its beat-unit form', () => {
    const metronome = measures
      .flatMap((measure) => measure.directions)
      .flatMap((direction) => direction.metronomes)[0]!;
    expect(metronome.beatUnits).toEqual([{ type: 'quarter', dots: 0 }]);
    expect(metronome.perMinute).toBe('85');
    expect(metronome.relation).toBeNull();
  });
});

describe('Guitar Tab Creator — a tablature part', () => {
  const part = load(EXAMPLES.TABLATURE_BENDS).parts[0]!;
  const tunings = part.getStaffTunings();

  it('reads the six string tunings that identify the staff as tablature', () => {
    expect(part.measures[0]!.getStaveLines()).toBe(6);
    expect(tunings.map((tuning) => tuning.line)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(tunings.map((tuning) => `${tuning.step}${tuning.octave}`)).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  });

  it('computes open-string MIDI numbers in standard tuning', () => {
    expect(tunings.map((tuning) => tuning.midi)).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it('reads the bends and the technical marks around them', () => {
    const notes = part.measures.flatMap((measure) => measure.notes);
    expect(notes.filter((note) => note.bend)).toHaveLength(4);
    expect(notes.find((note) => note.bend)?.bend).toEqual({ semitones: 4, release: false });
    expect([...new Set(notes.flatMap((note) => note.technicals.map((mark) => mark.technicalType)))]).toEqual([
      'string',
      'fret',
      'bend',
    ]);
  });
});

describe('LilyPond — the shapes only a positional walk reads', () => {
  it('keeps a syllable elided three ways apart', () => {
    const score = load(EXAMPLES['LILYPOND_61J-LYRICS-ELISIONS']);
    const runs = score.parts[0]!.measures.flatMap((measure) => measure.notes).map((note) => note.lyrics[0]?.runs);
    expect(runs[2]).toEqual([
      { kind: 'text', text: 'd' },
      { kind: 'elision', text: '' },
      { kind: 'text', text: 'e' },
    ]);
    expect(runs[3]!.filter((run) => run.kind === 'elision')).toHaveLength(2);
    expect(runs[3]!.map((run) => run.text).join('')).toBe('fgh'); // what `syllable` collapses to
  });

  it('reads a microtonal key signature in the order given', () => {
    const key = load(EXAMPLES['LILYPOND_13D-KEYSIGNATURES-MICROTONES']).parts[0]!.measures[0]!.getKey()!;
    expect(key.fifths).toBeNull(); // not the circle-of-fifths form at all
    expect(key.alterations.map((alteration) => alteration.alter)).toEqual([-1.5, -1, -0.5, 0, 0.5, 1, 1.5]);
    expect(key.alterations.map((alteration) => alteration.step)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('reaches grace notes that carry no onset of their own', () => {
    const notes = load(EXAMPLES['LILYPOND_24D-AFTERGRACE']).parts[0]!.measures.flatMap((measure) => measure.notes);
    const sounded = notes.filter((note) => !note.isGrace);
    expect(sounded[1]!.gracesBefore.map((grace) => grace.pitch?.step)).toEqual(['G', 'A', 'A']);
    expect(sounded[0]!.gracesBefore).toEqual([]);
    expect(notes.filter((note) => note.isGrace).every((note) => note.duration === null)).toBe(true);
  });
});

describe('LilyPond — the dialects that break an assumption', () => {
  it('reads an unmetered senza-misura signature', () => {
    const time = load(EXAMPLES['LILYPOND_11H-TIMESIGNATURES-SENZAMISURA']).parts[0]!.measures[0]!.getTime()!;
    expect(time.isSenzaMisura).toBe(true);
    expect(time.beats).toBeNull(); // there is no meter to report
  });

  it('carries a mid-score <divisions> change into the beats it reports', () => {
    const measures = load(EXAMPLES['LILYPOND_03C-RHYTHM-DIVISIONCHANGE']).parts[0]!.measures;
    const divisions = measures.map((measure) => measure.notes[0]!.divisions);
    expect(new Set(divisions).size).toBeGreaterThan(1); // the file really does change it
    // Whatever the divisions, a quarter note is one beat.
    for (const measure of measures) {
      const quarter = measure.notes.find((note) => note.type === 'quarter');
      if (quarter) {
        expect(quarter.beats).toBe(1);
      }
    }
  });

  it('keeps a volta number as the raw list MusicXML writes', () => {
    const endings = load(EXAMPLES['LILYPOND_45F-REPEATS-INVALIDENDINGS'])
      .parts[0]!.measures.flatMap((measure) => measure.barlines)
      .flatMap((barline) => (barline.ending ? [barline.ending] : []));
    expect(endings.map((ending) => ending.number)).toContain('1, 2, 3');
    expect(endings.map((ending) => ending.type)).toContain('discontinue');
  });

  it('reports an out-of-spec octave-shift size rather than snapping it', () => {
    const shifts = load(EXAMPLES['LILYPOND_33E-SPANNERS-OCTAVESHIFTS-INVALIDSIZE'])
      .parts[0]!.measures.flatMap((measure) => measure.directions)
      .flatMap((direction) => direction.octaveShifts);
    expect(shifts.map((shift) => shift.size)).toEqual([27, 27, 11, 11]);
    expect(shifts[0]!.partner).toBe(shifts[1]!); // still pairs, invalid size and all
  });

  it('reads a multi-staff measure whose keys differ after a <backup>', () => {
    const measure = load(EXAMPLES['LILYPOND_43C-MULTISTAFF-DIFFERENTKEYSAFTERBACKUP']).parts[0]!.measures[0]!;
    expect(measure.staveCount).toBe(2);
    expect(measure.getKey('1')?.fifths).not.toBe(measure.getKey('2')?.fifths);
  });

  it('measures an incomplete bar as short without calling it malformed', () => {
    const measures = load(EXAMPLES['LILYPOND_46F-INCOMPLETEMEASURES']).parts[0]!.measures;
    const beatsPerBar = Number(measures[0]!.getTime()!.beats);
    expect(measures.some((measure) => measure.endBeat < beatsPerBar)).toBe(true);
    expect(measures.every((measure) => measure.endBeat >= 0)).toBe(true);
  });
});

describe('Noteflight — navigation landmarks and tempo', () => {
  const directions = load(EXAMPLES.STAVE_REPETITIONS_CODA_ETC).parts[0]!.measures.flatMap(
    (measure) => measure.directions
  );

  it('reads the segno and coda a D.S. jumps to', () => {
    expect(directions.flatMap((direction) => direction.navigations)).toEqual(['segno', 'coda']);
  });

  it('reads the jump instructions as words', () => {
    expect(directions.flatMap((direction) => direction.words)).toEqual(['to coda', 'D.S. al Coda']);
  });
});

describe('iReal — rehearsal marks', () => {
  it('reads each mark, with an unstated enclosure staying null', () => {
    const marks = load(EXAMPLES.REHEARSAL_MARKS_BOLIVIA)
      .parts[0]!.measures.flatMap((measure) => measure.directions)
      .flatMap((direction) => direction.rehearsals);
    expect(marks.map((mark) => mark.text)).toEqual(['Intro', 'A', 'B']);
    expect(marks.every((mark) => mark.enclosure === null)).toBe(true);
  });
});

describe('Finale — a drum measure of tuplets and beams', () => {
  const measure = load(EXAMPLES.DRUM_TUPLET_BEAMS_MEASURE).parts[0]!.measures[0]!;

  it('reads each drum as a staff position, not a pitch', () => {
    const positions = measure.notes.filter((note) => note.unpitched).map((note) => note.unpitched);
    expect(positions).toHaveLength(10);
    expect(positions[0]).toEqual({ step: 'C', octave: 5 }); // a different row from...
    expect(positions[1]).toEqual({ step: 'A', octave: 4 }); // ...this one
  });

  it('groups the beams and places the measure content', () => {
    expect(measure.beamRuns().map((run) => run.notes.length)).toEqual([5, 5]);
    expect(measure.endBeat).toBe(2);
    expect(measure.notes.flatMap((note) => note.tuplets).map((tuplet) => tuplet.tupletType)).toEqual([
      'start',
      'stop',
      'start',
      'stop',
    ]);
  });
});

describe('W3C — a part-group over a concert score', () => {
  it('spans every part in the list', () => {
    const score = load(EXAMPLES.CONCERT_SCORE_AND_FOR_PART);
    expect(score.partGroups).toEqual([
      {
        fromPartIndex: 0,
        toPartIndex: score.parts.length - 1,
        symbol: 'bracket',
        name: null,
        abbreviation: null,
        barline: 'yes',
        depth: 0,
      },
    ]);
  });
});
