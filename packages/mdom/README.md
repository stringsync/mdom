# mdom

A DOM for MusicXML. Parse a score into a typed, queryable tree, edit it in
musical terms, and serialize it back. Unknown tags round-trip verbatim.

```sh
bun add @stringsync/mdom
```

## Parsing

```ts
import { MDOMParser } from '@stringsync/mdom';

const doc = new MDOMParser().parseFromString(xml);
const doc2 = await new MDOMParser().parseFromBlob(blob); // compressed .mxl
const score = doc.score;
```

## Serializing

```ts
import { MusicXMLSerializer, MXLSerializer } from '@stringsync/mdom';

new MusicXMLSerializer().serializeToString(doc); // string
await new MXLSerializer().serializeToBlob(doc); // .mxl Blob
```

## Guitar Pro

Import and export core notation and tablature in Guitar Pro 7/8 `.gp` archives:

```ts
import { GuitarProParser, GuitarProSerializer } from '@stringsync/mdom';

const parser = new GuitarProParser();
const doc = await parser.parseFromBlob(guitarProBlob);
const output = await new GuitarProSerializer().serializeToBlob(doc);
// Save output with a .gp extension.
```

`parseFromBytes(Uint8Array)` and `serializeToBytes(doc)` are also asynchronous.
GPIF is read and written directly with mdom’s XML tree and the existing ZIP
utilities. There is no alphaTab dependency, browser, audio player, network
connection, or Guitar Pro installation required. Adapted format-handling files
retain their MPL-2.0 notices; see [THIRD_PARTY.md](./THIRD_PARTY.md).

Exports select Guitar Pro's built-in RSE engine and assign a standard soundbank
for each instrument family, so playback does not require a MIDI output device.
MIDI program/channel values are retained. Exact timbres, amplifier effects,
and General MIDI sound variants are not preserved; variants use a neutral
sound from the exported instrument family.

The first supported subset includes:

- Pitched parts, up to two staves per exported part, and four voices per staff.
- Notes, rests, chords, whole through 128th durations, up to three dots,
  tuplet ratios, grace notes, and ties across measures.
- String/fret positions, open strings, nonstandard tuning, and a fixed capo.
- Simple time signatures, major/minor keys, treble/bass/alto/tenor clefs,
  pickups, repeats, and double barlines.
- Title, composer, lyricist, artist, copyright, part names, MIDI program/channel,
  tempo at measure boundaries, basic dynamics, text, staccato, and accents.

This is a musical conversion, not a lossless file round trip. Layout, engraving,
Guitar Pro application settings, and metadata outside the list above are not
preserved. Note pitches use sounding MIDI values; enharmonic spelling is
normalized using the key, and voice/part identifiers are regenerated. A tuned
staff carries both pitches and tablature positions on the same mdom notes.

Notation-only staves use Guitar Pro's internal tuning/string/fret encoding for
playback while tablature stays hidden. Import exposes string/fret positions and
tuning as MusicXML tablature only for staves with tablature enabled in the file.

Unsupported techniques and annotations, such as bends, harmonics, slides,
lyrics, chord diagrams, and alternate endings, throw by default. To deliberately
discard unsupported annotations, pass `{ unsupported: 'omit' }` as the last
argument to either parser or serializer methods. Invalid core data still throws:
for example, missing string assignments on a tuned staff, pitch/fret mismatches,
inconsistent durations, or mismatched meters across parts. Percussion, older
`.gp3`/`.gp4`/`.gp5`/`.gpx` input, and mid-score tuning changes are not supported.

The tests use committed, independently produced GP7 and GP8 fixtures with
[provenance and licensing](fixtures/guitar-pro/README.md), direct assertions on
exported GPIF XML, musical round trips, and validation against the vendored
MusicXML XSD. They follow `.wiz/rules`: one `describe` per file, state owned by
each test or its `beforeEach`, no mocks, and no branches or loops in tests.

```sh
mdom test guitar-pro             # Guitar Pro behavior tests
mdom test guitar-pro --coverage  # include Bun's coverage report
mdom test                       # full project tests (requires xmllint)
mdom fix                        # formatting, lint, and typecheck
```

## CRUD

```ts
import { MDocument } from '@stringsync/mdom';

const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');

voice.addNote({ step: 'C', octave: 4, type: 'quarter' }); // append; mdom lays out the timing
voice.addChord(
  [
    { step: 'E', octave: 4 },
    { step: 'G', octave: 4 },
  ],
  { type: 'quarter' }
);

const [note1, note2] = voice.notes;
note2.setPitch({ step: 'E', octave: 4, alter: -1 }); // retune, moves no time
note1.setDuration({ type: 'eighth' }); // reshape, ripples later notes in
note1.addTie(note2); // spanner
note2.convertToRest(); // silence, keep the beat
note2.remove(); // delete, onsets close the gap
```

Signatures and notation are written the same way — mdom assembles `<attributes>`
and keeps it in schema order, so a document built this way validates against the
MusicXML XSD:

```ts
const measure = MDocument.empty().score.addPart({ id: 'P1', name: 'Piano' }).addMeasure();

measure.setStaveCount(2); // a grand staff
measure.setKey({ fifths: -3, mode: 'minor' });
measure.setTime({ beats: 4, beatType: 4 });
measure.setClef({ sign: 'G', line: 2, staff: '1' });
measure.setClef({ sign: 'F', line: 4, staff: '2' });

measure.addDirection({ metronome: { beatUnit: 'quarter', dots: 1, perMinute: 120 }, tempo: 180 });
measure.addHarmony({ root: { step: 'E', alter: -1 }, kind: 'major-seventh' });

const note = measure.getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'quarter' });
note.addArticulation('staccato');

measure.addBarline({ barStyle: 'light-heavy', repeat: { direction: 'backward' } }); // the right edge, so: last

measure.setClef({ sign: 'C', line: 3, onset: 1 }); // a change at beat 1, not the measure's own signature
```

Every setter without an `onset` writes the measure's *leading* `<attributes>` —
the signature drawn with the stave — however many notes are already there. Pass
`onset` (in quarter-note beats) to write a mid-measure change instead;
`measure.getOrCreateAttributes({ onset })` is the escape hatch for whatever the
setters don't cover.

## Typed elements

Every printable part of a score has a typed node, so a consumer never walks raw
tags. `MElement`'s generic read axes (`child`, `childrenNamed`, `closest`) still
exist — they're mdom's internals, not the way to reach anything.

Its mutation API (`append`, `insertBefore`, `replaceChild`, `setText`,
`setAttribute`) is a different matter: that is the escape hatch for the corners
no writer covers yet, and MusicXML mdom doesn't model round-trips through it
verbatim. Reach for it with `measure.getOrCreateAttributes()` for a
`<transpose>`, say, and open an issue — a missing writer is a gap, not a design.

| | |
| --- | --- |
| Structure | `Score`, `Part`, `Measure`, `Voice`, `Chord`, `Note`, `Pitch` |
| Signatures | `Clef`, `Key`, `Time`, `StaffTuning`, `LineDetail` |
| Note marks | `Accidental`, `Lyric`, `Ornament`, `Technical`, `Beam`, `Tuplet` |
| Spanners | `Slur`, `Tie`, `Slide`, `Glissando`, `HammerOn`, `PullOff`, `WavyLine`, `Wedge`, `Pedal`, `OctaveShift`, `Bracket`, `Dashes` |
| Directions | `Direction`, `Dynamics`, `Words`, `Rehearsal`, `Metronome`, `MetronomeNote`, `Sound` |
| Symbols | `Harmony`, `FiguredBass`, `Figure`, `Frame`, `FrameNote` |
| Layout | `Print`, `SystemLayout`, `Scaling`, `Barline` |

MusicXML's positional readings are done here, once, rather than in every
consumer: a `<beat-unit>` and the `<beat-unit-dot/>`s that trail it, a
non-traditional key's `<key-step>`/`<key-alter>`/`<key-octave number>` runs, a
lyric's elision runs, a `<metronome-note>` group split at its
`<metronome-relation>`, and the flat `<part-group>` markers that become
`score.partGroups`.

```ts
direction.metronomes[0].beatUnits; // [{ type: 'quarter', dots: 1 }, { type: 'half', dots: 0 }]
measure.sounds; // <direction><sound> and the measure's own, merged
measure.clefChanges('2'); // [{ beat, clef }] — mid-measure changes, onsets rewound past <backup>
note.ornaments; // document order, so each <accidental-mark> stays with its ornament
score.partGroups; // [{ fromPartIndex, toPartIndex, symbol, depth, ... }]
note.color; // "#AARRGGBB" normalized to a CSS color
```

## Slicing

Signatures carry forward, so a measure lifted out of its score renders wrong on
its own. `materializeSignatures` writes back in whatever was in effect just
before it — clef, key, time, divisions, staves, staff-details, transpose,
part-symbol, measure-style — without overwriting what the measure already
declares.

```ts
const kept = part.measures.slice(8, 16);
kept[0].materializeSignatures();
part.measures.filter((measure) => !kept.includes(measure)).forEach((measure) => measure.remove());
```

A spacer measure inserted ahead of every declaration takes the same treatment
from the measure it displaced:

```ts
const gap = part.insertMeasureAt(0); // numbering is the caller's to set
gap.copySignaturesFrom(part.measures[1]);
```

## Cursors

```ts
import { MDocument, Cursor } from '@stringsync/mdom';

const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
voice.addNote({ step: 'D', octave: 4, type: 'quarter' });

const cursor = Cursor.at(voice); // immutable caret at (measure, voice, onset)
cursor.note; // C — the note under the caret
cursor.next()!.note; // D — movement returns a new caret; crosses barlines
cursor.next()!.next(); // null — past the last note (the append point)
```

See [e2e](../e2e) for worked examples.
