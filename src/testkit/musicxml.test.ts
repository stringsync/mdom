import { describe, expect, test } from 'bun:test';

import { mdom } from '../mdom';
import { Document } from '../nodes/document';
import { type Score, score } from './musicxml';

// spec(testkit.musicxml): the builder emits valid MusicXML for mdom.parse —
// every fixture below round-trips through the parse contract (well-formed
// XML, recognized MusicXML root) without throwing.
describe('testkit.musicxml', () => {
  test('score is the only entry point and returns a MusicXML string', () => {
    const xml = score((s) => {
      s.part('Violin I', (p) => {
        p.measure((m) => m.note('C4'));
      });
    });

    expect(xml).toStartWith('<?xml');
    expect(xml).toContain('<score-partwise');
    expect(xml).toContain('<part-name>Violin I</part-name>');
    expect(mdom.parse(xml)).toBeInstanceOf(Document);
  });

  // spec(testkit.pitch): a pitch is scientific-notation or { step, octave,
  // alter }; sharps, flats, and double-sharp (x) resolve to <alter>.
  test('pitch shorthand resolves accidentals', () => {
    const xml = score((s) => {
      s.part('P', (p) => {
        p.measure((m) => {
          m.note('C#4');
          m.note('Bb3');
          m.note('Fx5');
          m.note({ step: 'D', octave: 4, alter: -2 });
        });
      });
    });

    expect(xml).toContain('<step>C</step><alter>1</alter><octave>4</octave>');
    expect(xml).toContain('<step>B</step><alter>-1</alter><octave>3</octave>');
    expect(xml).toContain('<step>F</step><alter>2</alter><octave>5</octave>');
    expect(xml).toContain('<step>D</step><alter>-2</alter><octave>4</octave>');
    expect(() => mdom.parse(xml)).not.toThrow();
  });

  // spec(testkit.durations): durations are quarter notes; the builder derives
  // the minimal integer <divisions> so every duration lands on a tick.
  test('divisions is derived from quarter-note durations', () => {
    const xml = score((s) => {
      s.part('P', (p) => {
        p.measure((m) => {
          m.note('C4', 0.5); // eighth -> needs /2
          m.note('C4', 1 / 3); // triplet eighth -> needs /3
        });
      });
    });

    // lcm(2, 3) = 6 ticks per quarter
    expect(xml).toContain('<divisions>6</divisions>');
    expect(xml).toContain('<duration>3</duration>'); // 0.5 * 6
    expect(xml).toContain('<duration>2</duration>'); // (1/3) * 6
  });

  test('divisions forces a specific value', () => {
    const xml = score((s) => {
      s.divisions(4).part('P', (p) => {
        p.measure((m) => m.note('C4', 1));
      });
    });

    expect(xml).toContain('<divisions>4</divisions>');
    expect(xml).toContain('<duration>4</duration>');
  });

  // spec(testkit.pitch): a chord is one call with several pitches; a rest
  // takes no pitch.
  test('chord emits N notes with <chord/>; rest emits <rest/>', () => {
    const xml = score((s) => {
      s.part('P', (p) => {
        p.measure((m) => {
          m.chord(['C4', 'E4', 'G4'], 2);
          m.rest(2);
        });
      });
    });

    expect(xml.match(/<chord\/>/g)).toHaveLength(2); // 2nd and 3rd chord tones
    expect(xml).toContain('<rest/>');
    expect(() => mdom.parse(xml)).not.toThrow();
  });

  // spec(testkit.mods): the mod configurator covers the mdom.mods
  // surface; spanning mods emit start/stop endpoints on hosting notes.
  test('mods render onto the hosting notes', () => {
    const xml = score((s) => {
      s.part('P', (p) => {
        p.measure((m) => {
          m.note('C4', 0.5, (n) => n.slur('start').beam('begin').staccato());
          m.note('D4', 0.5, (n) => n.slur('stop').beam('end').tie('start').lyric('la'));
          m.note('E4', 1 / 3, (n) => n.tuplet(3, 2));
        });
      });
    });

    expect(xml).toContain('<slur type="start" number="1"/>');
    expect(xml).toContain('<slur type="stop" number="1"/>');
    expect(xml).toContain('<beam number="1">begin</beam>');
    expect(xml).toContain('<articulations><staccato/></articulations>');
    expect(xml).toContain('<tie type="start"/>');
    expect(xml).toContain('<tied type="start"/>');
    expect(xml).toContain('<lyric number="1"><syllabic>single</syllabic><text>la</text></lyric>');
    expect(xml).toContain('<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes>');
    expect(() => mdom.parse(xml)).not.toThrow();
  });

  test('multi-voice writing via backup/forward and voice/staff placement', () => {
    const xml = score((s) => {
      s.part('Piano', (p) => {
        p.measure(
          {
            staves: 2,
            clef: [
              ['G', 2],
              ['F', 4],
            ],
          },
          (m) => {
            m.note('C5', 4, (n) => n.voice(1).staff(1));
            m.backup(4);
            m.note('C3', 4, (n) => n.voice(2).staff(2));
          }
        );
      });
    });

    expect(xml).toContain('<staves>2</staves>');
    expect(xml).toContain('<clef number="1"><sign>G</sign><line>2</line></clef>');
    expect(xml).toContain('<clef number="2"><sign>F</sign><line>4</line></clef>');
    expect(xml).toContain('<backup><duration>');
    expect(xml).toContain('<voice>2</voice>');
    expect(xml).toContain('<staff>2</staff>');
    expect(() => mdom.parse(xml)).not.toThrow();
  });

  test('measure attributes render key, time, clef, and tempo', () => {
    const xml = score((s) => {
      s.part('P', (p) => {
        p.measure({ time: [3, 4], key: 2, clef: ['G', 2], tempo: 120 }, (m) => m.note('C4', 3));
      });
    });

    expect(xml).toContain('<key><fifths>2</fifths></key>');
    expect(xml).toContain('<time><beats>3</beats><beat-type>4</beat-type></time>');
    expect(xml).toContain('<sound tempo="120"/>');
    expect(() => mdom.parse(xml)).not.toThrow();
  });

  // spec(testkit.escapes): timewise() emits score-timewise so both
  // mdom.parse normalization paths are testable from one description.
  test('timewise emits score-timewise and still parses', () => {
    const build = (s: Score) => {
      s.part('A', (p) => p.measure((m) => m.note('C4')));
      s.part('B', (p) => p.measure((m) => m.note('E4')));
    };

    const partwise = score(build);
    const timewise = score((s) => {
      s.timewise();
      build(s);
    });

    expect(partwise).toContain('<score-partwise');
    expect(timewise).toContain('<score-timewise');
    // one <measure> wrapping both <part>s in timewise
    expect(timewise).toContain('<measure number="1"><part id="P1">');
    expect(timewise).toContain('<part id="P2">');
    expect(mdom.parse(timewise)).toBeInstanceOf(Document);
  });

  // spec(testkit.escapes): raw() at score, measure, and note scope injects
  // verbatim XML so a test never has to extend the builder.
  test('raw escape hatch at every scope', () => {
    const xml = score((s) => {
      s.raw('<work><work-title>Etude</work-title></work>');
      s.part('P', (p) => {
        p.measure((m) => {
          m.raw('<barline location="right"><bar-style>light-heavy</bar-style></barline>');
          m.note('C4', 1, (n) => n.raw('<stem>up</stem>'));
        });
      });
    });

    expect(xml).toContain('<work><work-title>Etude</work-title></work>');
    expect(xml).toContain('<barline location="right">');
    expect(xml).toContain('<stem>up</stem>');
    expect(() => mdom.parse(xml)).not.toThrow();
  });

  test('text is XML-escaped', () => {
    const xml = score((s) => {
      s.part('Voice & "Lead"', (p) => {
        p.measure((m) => m.note('C4', 1, (n) => n.lyric('rock & roll')));
      });
    });

    expect(xml).toContain('<part-name>Voice &amp; "Lead"</part-name>');
    expect(xml).toContain('<text>rock &amp; roll</text>');
    expect(() => mdom.parse(xml)).not.toThrow();
  });
});
