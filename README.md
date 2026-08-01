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

## Typed elements

Every printable part of a score has a typed node, so a consumer never walks raw
tags. `MElement`'s generic axes (`child`, `childrenNamed`, `closest`) still exist
— they're mdom's internals, not the way to reach anything.

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

See [e2e](./e2e) for worked examples.

## Development

```sh
profile=~/.${SHELL##*/}rc # ~/.zshrc, ~/.bashrc, etc.
echo "export PATH=\"$PWD/bin:\$PATH\"" >> "$profile"
source "$profile"

mdom test   # run the test suite
mdom fix    # typecheck, format, lint
```
