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

## Untrusted input

mdom is safe to run on scores you did not write:

- Serialized output is always well-formed XML whose structure matches the
  tree. Text, attribute, and CDATA values are escaped, so no string in a
  document can turn into markup. Element and attribute names must be valid XML
  names, and setting anything else throws.
- Doctypes are limited to `root`, `root SYSTEM "uri"`, and
  `root PUBLIC "id" "uri"`. The parser drops an internal subset and never
  expands custom entities or fetches external ones.
- Archives (`.mxl`, `.gp`, `.gpx`) are limited to 128 MiB of uncompressed data by
  default, which guards against zip bombs. Pass
  `{ maxUncompressedBytes }` to `parseFromBlob` to change the limit.

Values you read from a score (titles, lyrics, `<words>`, attributes) are the
raw, unescaped text the score holds. Treat them as untrusted: render them with
`textContent` or your framework's escaping, never with `innerHTML`.

## Guitar Pro

Import and export core notation and tablature in Guitar Pro 7/8 `.gp` archives. Guitar Pro 6 `.gpx` and Guitar Pro 5 `.gp5` files import only; `GuitarProParser` detects them by their header:

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

- Pitched and percussion parts, and four voices per staff. A Guitar Pro track holds at most
  two staves, so a part with more exports as consecutive tracks of up to two
  staves each, which import back as separate parts.
- Notes, rests, chords, whole through 128th durations, up to three dots,
  tuplet ratios, grace notes, and ties across measures.
- String/fret positions, open strings, nonstandard tuning, and a fixed capo.
- Simple time signatures, major/minor keys, treble/bass/alto/tenor clefs,
  pickups, repeats, and double barlines.
- Alternate endings as volta brackets (passes 1 to 32), and segno, segno-segno,
  coda, double coda and Fine targets with every D.C./D.S./D.S.S. jump (al Coda,
  al Double Coda, al Fine) and To Coda/To Double Coda, written as MusicXML
  `<direction>`s whose `<sound>` plays them: targets at the bar's start, jumps
  and Fine at its end. On export a third distinct segno or coda id, a jump with
  `time-only` passes, and an ending with no pass numbers are unsupported; free
  time stays unsupported on import.
- Triplet feel (triplet, dotted and Scottish, on eighths or 16ths) as a
  standalone swing `<sound>` (2:1, 3:1 or 1:3) where a bar's feel changes, and
  `<straight/>` where it ends; nothing is printed. Export carries the last swing
  across bars; a swing mid-bar applies from the bar's start, and other ratios
  or units are unsupported. Guitar Pro 5 bars import triplet eighths and 16ths.
- Title, composer, lyricist, artist, copyright, part names, MIDI program/channel,
  tempo (including mid-measure and gradual changes), basic dynamics, text, staccato, and accents.
- Lyrics: each track's lyric lines become verses on its first staff's first voice, one syllable per sounded note (rests, chord extras, grace notes and tie
  continuations are skipped). Text splits on spaces and `-`, `+` elides words on
  one beat, `_` is a space inside a syllable, and a lone `-` skips a beat.
- Chord diagrams: each becomes a `<harmony>` over the beat that names it, with
  root, kind, altered/added/omitted degrees and slash bass from the diagram's
  chord (or, in Guitar Pro 6, parsed from its name, kept as the kind's `text`
  when it differs from the usual suffix), and a `<frame>` with strings, frets,
  fingering, barres and the first fret. Export writes each distinct harmony
  once to the staff's diagram collection; one without a frame shows its name
  only. A second chord symbol on one beat, Roman numerals and polychords are unsupported.
- Beat effects: fermatas (short, medium and long as angled, normal and square;
  their playback length is not kept), brushes and arpeggios as `<arpeggiate>`
  (a down stroke strikes the low string first, so it rolls `up`; export writes
  a brush), tremolo picking as a one- to three-slash `<tremolo>`, beat ottavas
  (8va, 8vb, 15ma, 15mb) as `<octave-shift>` spans over each run of beats, pick
  strokes as `<down-bow>`/`<up-bow>`, and tapping as `<tap hand="right">`.
  Slap, pop and the whammy bar are unsupported.
- Percussion tracks: each note is unpitched on a percussion clef, drawn on its
  drum's staff line with the kit's notehead (x, circle-x, diamond, triangle,
  circled, slashed), and names a `<score-instrument>` per drum whose
  `<midi-instrument>` holds the General MIDI key as `<midi-unpitched>`. Guitar
  Pro 7/8 kits are read from the file; Guitar Pro 6 element/variation and
  Guitar Pro 5 MIDI-key drums map onto Guitar Pro's standard kit. Export writes
  that standard kit and picks each note's drum by its instrument's MIDI key,
  then its name, staff line and notehead; a note whose instrument names no key
  or kit drum takes the kit's first drum on its line, reported as
  `percussion instruments without a General MIDI drum key`. A track cannot mix
  pitched and unpitched notes.

This is a musical conversion, not a lossless file round trip. Layout, engraving,
Guitar Pro application settings, and metadata outside the list above are not
preserved. Note pitches use sounding MIDI values; enharmonic spelling is
normalized using the key, and voice/part identifiers are regenerated. A tuned
staff carries both pitches and tablature positions on the same mdom notes.

Guitar Pro 5 files are read record by record into the same GPIF tables, so they
yield the same tree as the matching `.gp`. A bar that stores fewer beats than its
meter is padded with rests, and an empty bar stays empty. Effects, chord diagrams,
lyrics, alternate endings and jumps are skipped correctly but throw by default.

Notation-only staves use Guitar Pro's internal tuning/string/fret encoding for
playback while tablature stays hidden. Import exposes string/fret positions and
tuning as MusicXML tablature only for staves with tablature enabled in the file.

Bends (a rise, a release, or a pre-bend), natural, artificial, pinch and tap
harmonics, dead and ghost notes, palm mutes and let ring round-trip as
MusicXML technicals. Hammer-ons and pull-offs (Guitar Pro picks which from the
pitch direction) round-trip as `<hammer-on>`/`<pull-off>` with a slur, shift
slides as `<slide>`, legato slides as `<slide>` with a slur, and slides into and
out of a note as `<scoop>`, `<plop>`, `<doit>` and `<falloff>`. A glissando
exports as the slide it plays as, so it reads back as a `<slide>`. Other slurs
round-trip as Guitar Pro's beat legato, which slurs a beat to the next one in
its voice: a slur must join two notes of one voice and share no note with
another slur, which Guitar Pro would merge it with. Slight and wide vibrato
round-trip as a `<wavy-line>` over each note (a wide one names the
`wiggleVibratoWide` glyph). Unsupported techniques and annotations, such as
trills, throw by default. To deliberately
discard unsupported annotations, pass `{ unsupported: 'omit' }` as the last
argument to either parser or serializer methods, and add
`onUnsupported: (feature) => ...` to hear each feature it drops. Invalid core
data still throws:
for example, missing string assignments on a tuned staff, pitch/fret mismatches,
inconsistent durations, or mismatched meters across parts. Older
`.gp3`/`.gp4` input, `.gpx` output, and mid-score tuning changes are not supported.

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
voice.addUnpitched({ step: 'C', octave: 5, type: 'quarter' }); // a drum hit at a staff position
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
measure.addSound({ swing: { first: 2, second: 1 } }); // swung eighths, nothing printed

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

## Lyrics

`note.setLyric(spec)` sings one syllable of one verse; a note keeps one lyric
per verse, so setting a verse again replaces it. Type the hyphens the way lyrics
are written and mdom works out `<syllabic>` from them, dropping them from the
text; pass `syllabic` to write the text as is.

```ts
const [first, second, third] = notes;
first.setLyric({ text: 'Hal-' }); // begin
second.setLyric({ text: '-le-', extend: 'start' }); // middle, a melisma line follows
third.setLyric({ extend: 'stop' }); // the line ends here
first.setLyric({ text: ['look', 'it'], elision: '‿', verse: '2' }); // two words on one note
first.removeLyric('2');
```

## Tuplets and complex signatures

`timeModification` sets a note's cumulative performed ratio. Printed tuplet
brackets are separate: `first.addTuplet(last, options)` pairs the endpoints and
can display a different ratio (including nested groups).

```ts
const voice = measure.getOrCreateVoice('1');
const notes = Array.from({ length: 3 }, () => voice.addRest({
  type: 'eighth', timeModification: { actual: 3, normal: 2, normalType: 'eighth' },
}));
notes[0].addTuplet(notes[2], {
  bracket: true, showNumber: 'both',
  actual: { number: 3, type: 'eighth' }, normal: { number: 2 },
});
notes[0].setTimeModification({ actual: 5, normal: 4 });
notes[0].setDuration({ type: 'quarter' }); // retains the performed ratio
notes[0].setTimeModification(null); // returns to the written duration

measure.setKey({ alterations: [
  { step: 'F', alter: 0.5, accidental: 'quarter-sharp', octave: 4 },
  { step: 'B', alter: -1 },
] });
measure.setKey({ fifths: 1, cancel: { fifths: -2, location: 'before-barline' } });
measure.setTime({ components: [{ beats: '3+2', beatType: 8 }, { beats: 2, beatType: 4 }],
  interchangeable: { components: [{ beats: 9, beatType: 8 }], relation: 'equals' },
});
measure.setTime({ senzaMisura: 'X', staff: '2' });
```

`Note.timeModification` includes `normalType` (null when omitted) and
`normalDots`. These describe the reference unit; playback duration is the
written type and dots multiplied by `normal / actual`. Both duration setters
ripple later notes in the voice and keep the next voice anchored. New scores
use 26880 divisions per quarter, supporting triplets, quintuplets and septuplets.
Imported divisions are retained. A duration that cannot be represented as an
integer at the current divisions throws before changing the note; set suitable
divisions before writing such a score.

Complex metronomes use the same `measure.addDirection({ metronome })` entry point:

```ts
measure.addDirection({ metronome: {
  beatUnit: 'quarter', tied: [{ type: 'eighth' }], perMinute: 'ca. 120',
} });
measure.addDirection({ metronome: {
  beatUnit: 'quarter', dots: 1, equivalent: { type: 'half' },
} });
measure.addDirection({ metronome: {
  arrows: true,
  left: [{ type: 'eighth', beams: ['begin'] }, { type: 'eighth', beams: ['end'] }],
  relation: { operator: 'equals', right: [{ type: 'quarter',
    tuplet: { type: 'start', actual: 3, normal: 2, normalType: 'eighth',
      normalDots: 1, bracket: false, showNumber: 'both' },
  }] },
} });
```

`Metronome.beatUnitGroups` retains each side's tied units. `relationOperator`
preserves an absent versus explicitly empty relation, and `arrows` reads the
arrow marker. Each `MetronomeNote` exposes `tied`, numbered `beamDetails`, and
its tuplet's reference type, dots and display attributes. The existing
`beatUnits`, `relation`, and flattened `Direction.metronome` reads remain available.

## Transactions and undo/redo

Access `doc.history` to enable synchronous transactions for that document. Set up
or parse the document first; earlier edits do not become undo steps.

```ts
const history = doc.history;
const unlisten = history.events.on('change', ({ kind, label }) => {
  render(doc); // one completed edit, undo, or redo
  updateUndoButton(history.canUndo, history.undoLabel);
  updateRedoButton(history.canRedo, history.redoLabel);
});

history.edit('Add staccato', () => {
  first.addArticulation('staccato');
  second.addArticulation('staccato');
});
history.undo();
history.redo();
unlisten(); // release this subscription when the editor unmounts
```

`edit(label, callback)` returns the callback's result. All mutations in the
callback become one step, including structural edits, `setAttribute`,
`removeAttribute`, `setText`, direct text/CDATA `value` assignments, and the
indirect changes made by methods such as `setPitch`, `setDuration`, and
`addSlur`. If the callback throws, every recorded mutation is restored and the
same error is rethrown; both history stacks remain intact.

Undo and redo restore field values and links on the original objects. They
never serialize/reparse the document or run the callback again. Selected note
references remain valid, and removed or replaced nodes are the exact objects
reattached by undo. Newly inserted nodes are likewise reused by redo.

`canUndo` and `canRedo` report availability; `undoLabel` and `redoLabel` are the
next action's label, or `null`. `undo()` and `redo()` return `false` on empty
history and emit nothing. Empty edits, same-value setters, and edits that put
all values and node links back where they started preserve redo and create no
step. Identity is part of the state: replacing a node with a different node
counts as an edit even when their XML is identical. A new effective edit clears
redo. Attribute ordering is preserved as well as values.

The editing boundaries are deliberate:

- **Outside transactions:** existing mutation APIs work freely until history is
  enabled. Afterward, writes to that document require `history.edit` and throw
  before changing it when called outside a transaction. There is no implicit
  transaction or automatic history reset. Unattached builders remain freely
  editable until first inserted; builders left unattached are excluded from
  committed history.
- **Detached nodes:** nodes retain document ownership after removal, rollback,
  or undo. They still require a transaction, and effective edits to previously
  owned detached nodes also create a step. This protects nodes retained by redo.
  Newly built temporary subtrees inserted and removed in one transaction do not
  themselves make that transaction effective.
- **Nesting:** `edit`, `undo`, `redo`, and `dispose` cannot run inside an edit,
  including through another document's history. They throw immediately. An
  uncaught error rolls back the outer edit; catching it allows the outer edit
  to continue, without an inner step or savepoint.
- **Async callbacks:** native async functions are rejected before invocation.
  Returning a promise or callable thenable rolls back the synchronous work and
  throws. The TypeScript signature also rejects promise-returning callbacks.
  Scheduled work cannot extend a transaction: later document writes outside
  `edit` throw. JavaScript cannot cancel arbitrary scheduled work or undo
  non-document side effects; keep callbacks synchronous and limited to edits.
- **Document boundaries:** a node can belong to only one document. Moving owned
  nodes into another document or an unowned tree, rewrapping an owned root, and
  inserting document roots throw before detachment, even without history.
  Ownership persists after removal. Build fresh nodes to copy across documents.
  An active transaction also rejects writes to any other document.
- **Notifications:** `events.on('change', listener)` receives `{ kind, label }`
  once after each effective edit, undo, or redo, with updated history state.
  Rollback and no-ops emit nothing. Mutation and history operations during
  delivery throw. Listener exceptions propagate after the commit and may stop
  later listeners; they do not roll back the committed document or history.
- **Read-only structure:** use mutation methods for child links; `parent` has no
  setter and `children` is a frozen array. XML declaration fields are frozen;
  the declaration, doctype, root, and element tags are not editing APIs.

History retains the nodes and field values needed by its steps. Call
`history.dispose()` to release all steps and listeners without changing the
current document or emitting a change. Disposal is idempotent; the same history
remains enabled and usable for new transactions. mdom does not track selection,
input, or rendering state.

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
| Signatures | `Clef`, `Key`, `Time`, `StaffTuning`, `LineDetail`, `MeasureStyle` |
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

Measure styles declare slash notation, beat repeats, measure repeats, or multiple
rests. Each block has one style; append separate declarations for simultaneous
families or start/stop changes. These writers leave the underlying music intact.

```ts
measure.addMeasureStyle({
  kind: 'slash', type: 'start', staff: '1', useStems: true,
  slashType: 'quarter', dots: 1, exceptVoices: ['2'],
});
measure.addMeasureStyle({ kind: 'slash', type: 'stop', staff: '1', onset: 2 });
measure.addMeasureStyle({ kind: 'measure-repeat', type: 'start', count: 2, slashes: 2 });
measure.addMeasureStyle({ kind: 'beat-repeat', type: 'start', useDots: false });
measure.addMeasureStyle({ kind: 'multiple-rest', count: 4, useSymbols: false });
measure.measureStyles; // this measure's declarations, in document order
measure.getActiveMeasureStyle('slash', '1'); // active start at the measure opening, or null
measure.getMultiRestCount(); // count only where the multiple-rest begins
```

`onset` is in quarter-note beats. Stateful styles carry forward independently
until a matching stop; `multiple-rest` supplies its own extent and is read only
where declared. A style's `staff` preserves an absent number as null (all staves),
and optional boolean and numeric attributes remain null when unwritten. Inspect
`type`, `count`, `slashes`, `useStems`, `useDots`, `useSymbols`, `slashType`,
`dots`, and `exceptVoices` on each typed `MeasureStyle`; remove a declaration
with `remove()`.

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
