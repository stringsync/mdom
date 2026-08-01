# Changelog

## 0.2.0

The query layer grew to cover what consumers were reaching past it for. Additive
except where noted — no accessor was removed, and `MElement`'s generic axes are
unchanged.

### Changed behavior

Three fixes change what existing accessors return. The first two change rendered
output, which is the point, but consumers should know.

- **Note-attached spanners now pair in ONSET order, not document order**
  (`Slur`, `Tie`, `Slide`, `Glissando`, `HammerOn`, `PullOff`, `Beam`, `Tuplet`).
  A `<backup>` writes a later voice's notes after an earlier voice's even though
  they sound together, so a slur opening in the left hand and closing on a
  right-hand note the exporter wrote earlier used to find no stop at all and run
  on until some later measure's — two bars of ink across the page, on every
  cross-stave piano figure Finale exports. A closer now takes the open start in
  the same voice when there is one, else the oldest open start (a chord, whose
  members open together). Direction spanners (`Wedge`, `Pedal`, `OctaveShift`,
  and the new `Bracket`/`Dashes`) resolve the same way.
- **`Measure.beams` no longer closes a run at a level-1 `end`.** Only a new
  `begin` or an unbeamed note closes one; a rest carrying no beam markers sits
  under the beam without breaking it. Guitar Pro writes a triplet-of-16ths + two
  16ths as `begin, continue, end, continue, end` — one primary beam with a
  sub-beam split — and the trailing notes used to come out flagged. The split
  positions are reported by the new `Measure.beamRuns()`.
- **`Note.notehead` gained `filled` and `color`.** Code that compared the whole
  object (`toEqual({ value, parentheses })`) needs the two new keys.

### Lossy accessors fixed

- `Print.systemBreak` / `Print.pageBreak` keep `'yes' | 'no' | null` distinct —
  `"no"` is a positive statement, not silence. The `newSystem`/`newPage`
  booleans are unchanged.
- `Note.notehead.filled` is a tri-state: `null` means unstated, so the duration
  decides.
- `Direction.metronomes` replaces the flattened `Direction.metronome`, which
  dropped the second beat unit of a metric modulation, the `parentheses`
  attribute, and the `<metronome-note>` form. The old accessor stays.

### New elements

`Metronome`, `MetronomeNote`, `Sound`, `Dynamics`, `Rehearsal`, `Words`,
`Bracket`, `Dashes`, `FiguredBass`, `Figure`, `StaffTuning`, `Ornament`,
`Technical`, and the `PartGroupSpan` shape.

### New queries

- `Direction`: `metronomes`, `sound`, `dynamics`, `rehearsals`, `wordsElements`,
  `navigations`, `brackets`, `dashes`, `staff`, `placement`, `measure`
- `Measure`: `sounds`, `figuredBasses`, `isImplicit`, `beamRuns()`,
  `getStaffTunings()`, `clefChanges()`, `clefAtEnd()`, `endBeat`, `part`
- `Note`: `ornaments`, `technicals`, `nonArpeggiate`, `unpitched`,
  `restPosition`, `gracesBefore`, `printObject`, `color`, `stemColor`,
  `measure`, `part`
- `Score.partGroups`, `Part.getStaffTunings()`, `Voice.part`
- `Key.alterations` (non-traditional keys), `Lyric.runs` (elisions),
  `Barline.measureBeat`, `Accidental.editorial`
- `Tuplet`: `placement`, `bracket`, `showNumber`, `showType`, `actual`, `normal`
- `lineType` on `Slur`, `Tie`, `Glissando`, `Slide`, `Bracket`, `OctaveShift`
- `color` on `Note`, the `notehead` shape, `Beam`, `Lyric`, `Direction`,
  `Accidental`, `Barline`, `Dynamics`, `Words`, `Rehearsal` — normalized from
  MusicXML's alpha-first `"#AARRGGBB"` to a CSS color
- Typed non-null ancestors (`note.measure`, `slur.part`, `wedge.measure`, …) so
  a consumer never touches `.parent` or `closest()`
- `measureBeat` on `Slur`, `Slide`, `Glissando`, `HammerOn` and `PullOff`, which
  had been the only spanners without it, and `measure` on `Bracket`/`Dashes` to
  match the other direction spanners

### Structural operations

- `Part.insertMeasureAt(index, opts?)` — insert a measure, numbering left to the
  caller.
- `Measure.copySignaturesFrom(source)` — give a measure inserted before every
  declaration the signatures it needs to render.
- `Measure.materializeSignatures()` — write in whatever was in effect just
  before this measure, so it survives on its own. The primitive a slice, an
  excerpt, or a single-measure preview is built from.

## 0.1.5

Fixed `Measure.getMultiRestCount`; added an executable CLI script.
