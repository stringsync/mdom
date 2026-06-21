// A curated cross-exporter corpus: one (small) real-world file per distinct source
// software, plus a few hand-built fault-tolerance fixtures. The axis that matters for
// fault tolerance is the *exporter* — what wrote the file — not the musical content, so
// the suites below are grouped by `<identification><encoding><software>`. See
// compatibility.test.ts for the round-trip idempotence invariant this corpus exists to
// prove. Trimmed from the full ~250-file set; add a file only when it exercises a
// dialect the current corpus doesn't.

export const EXAMPLES = {
  // Finale (Mac v27, Windows v25)
  CHOPIN_PRELUDE: 'chopin_prelude.xml',
  DRUM_TUPLET_BEAMS_MEASURE: 'drum_tuplet_beams_measure.xml',
  // Finale 2011 for Windows + Dolet 5.5 (the reference MusicXML exporter)
  ACTOR_PRELUDE_SAMPLE: 'actor_prelude_sample.xml',
  // Guitar Pro
  WANNA_SKIP_CLASS: 'wanna_skip_class.xml',
  // MuseScore (v2, v3)
  ACCIDENTALS: 'accidentals.xml',
  OCTAVE_SHIFT_SIMPLE_PIANO: 'octave_shift_simple_piano.xml',
  // Sibelius (v19, v5.1)
  COMPOSER_ONE_LINE: 'composer_one_line.xml',
  'LILYPOND_99A-SIBELIUS5-IGNOREBEAMING': 'lilypond_99a-Sibelius5-IgnoreBeaming.xml',
  // Dorico
  SORTED_NOTES_CHORD_VEXFLOW_KEYS_ORDER: 'sorted_notes_chord_vexflow_keys_order.xml',
  // Noteflight
  STAVE_REPETITIONS_CODA_ETC: 'stave_repetitions_coda_etc.xml',
  // iReal Pro (@infojunkie/ireal-musicxml)
  REHEARSAL_MARKS_BOLIVIA: 'rehearsal_marks_bolivia.xml',
  // guitartabcreator.com
  TABLATURE_BENDS: 'tablature_bends.xml',
  // LilyPond — dialect and edge-case stress files (no <software> tag)
  'LILYPOND_03C-RHYTHM-DIVISIONCHANGE': 'lilypond_03c-Rhythm-DivisionChange.xml',
  'LILYPOND_11H-TIMESIGNATURES-SENZAMISURA': 'lilypond_11h-TimeSignatures-SenzaMisura.xml',
  'LILYPOND_13D-KEYSIGNATURES-MICROTONES': 'lilypond_13d-KeySignatures-Microtones.xml',
  'LILYPOND_33E-SPANNERS-OCTAVESHIFTS-INVALIDSIZE': 'lilypond_33e-Spanners-OctaveShifts-InvalidSize.xml',
  'LILYPOND_45F-REPEATS-INVALIDENDINGS': 'lilypond_45f-Repeats-InvalidEndings.xml',
  'LILYPOND_46F-INCOMPLETEMEASURES': 'lilypond_46f-IncompleteMeasures.xml',
  'LILYPOND_43C-MULTISTAFF-DIFFERENTKEYSAFTERBACKUP': 'lilypond_43c-MultiStaff-DifferentKeysAfterBackup.xml',
  'LILYPOND_24D-AFTERGRACE': 'lilypond_24d-AfterGrace.xml',
  'LILYPOND_61J-LYRICS-ELISIONS': 'lilypond_61j-Lyrics-Elisions.xml',
  'LILYPOND_41H-TOOMANYPARTS': 'lilypond_41h-TooManyParts.xml',
  // W3C MusicXML sample / tutorial files (no <software> tag)
  HELLO_WORLD: 'hello_world.xml',
  NOTE_VARIATIONS: 'note_variations.xml',
  CONCERT_SCORE_AND_FOR_PART: 'concert_score_and_for_part.xml',
  // Hand-built fault-tolerance fixtures
  INVALID_ROOT: 'invalid_root.xml',
  MOSTLY_INVALID: 'mostly_invalid.xml',
  PARTIALLY_INVALID: 'partially_invalid.xml',
} as const;

/** Valid files grouped by the exporter that wrote them. */
export const EXAMPLE_SUITES = {
  FINALE: [EXAMPLES.CHOPIN_PRELUDE, EXAMPLES.DRUM_TUPLET_BEAMS_MEASURE],
  DOLET: [EXAMPLES.ACTOR_PRELUDE_SAMPLE],
  GUITAR_PRO: [EXAMPLES.WANNA_SKIP_CLASS],
  MUSESCORE: [EXAMPLES.ACCIDENTALS, EXAMPLES.OCTAVE_SHIFT_SIMPLE_PIANO],
  SIBELIUS: [EXAMPLES.COMPOSER_ONE_LINE, EXAMPLES['LILYPOND_99A-SIBELIUS5-IGNOREBEAMING']],
  DORICO: [EXAMPLES.SORTED_NOTES_CHORD_VEXFLOW_KEYS_ORDER],
  NOTEFLIGHT: [EXAMPLES.STAVE_REPETITIONS_CODA_ETC],
  IREAL: [EXAMPLES.REHEARSAL_MARKS_BOLIVIA],
  GUITAR_TAB_CREATOR: [EXAMPLES.TABLATURE_BENDS],
  LILYPOND: [
    EXAMPLES['LILYPOND_03C-RHYTHM-DIVISIONCHANGE'],
    EXAMPLES['LILYPOND_11H-TIMESIGNATURES-SENZAMISURA'],
    EXAMPLES['LILYPOND_13D-KEYSIGNATURES-MICROTONES'],
    EXAMPLES['LILYPOND_33E-SPANNERS-OCTAVESHIFTS-INVALIDSIZE'],
    EXAMPLES['LILYPOND_45F-REPEATS-INVALIDENDINGS'],
    EXAMPLES['LILYPOND_46F-INCOMPLETEMEASURES'],
    EXAMPLES['LILYPOND_43C-MULTISTAFF-DIFFERENTKEYSAFTERBACKUP'],
    EXAMPLES['LILYPOND_24D-AFTERGRACE'],
    EXAMPLES['LILYPOND_61J-LYRICS-ELISIONS'],
    EXAMPLES['LILYPOND_41H-TOOMANYPARTS'],
  ],
  W3C: [EXAMPLES.HELLO_WORLD, EXAMPLES.NOTE_VARIATIONS, EXAMPLES.CONCERT_SCORE_AND_FOR_PART],
} as const;

/** Hand-built fixtures that probe how the parser handles broken/empty input. */
export const MALFORMED = {
  /** Mismatched root tags — not well-formed XML; parsing must throw. */
  INVALID_ROOT: EXAMPLES.INVALID_ROOT,
  /** Well-formed XML, but no parts — a valid-but-empty score. */
  MOSTLY_INVALID: EXAMPLES.MOSTLY_INVALID,
  /** Non-numeric `<divisions>`/`<duration>` content the parser must tolerate. */
  PARTIALLY_INVALID: EXAMPLES.PARTIALLY_INVALID,
} as const;
