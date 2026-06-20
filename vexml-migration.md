# Using mdom in `@stringsync/vexml`

The repo is located at https://github.com/stringsync/vexml.

Recommendation and adoption checklist. Written after a code read of vexml's
`src/musicxml/`, `src/parsing/`, and `src/data/`, plus three proof spikes in
mdom (`clef.ts`, `slur.ts`, `note.ts`, with tests `clef.test.ts`,
`slur.test.ts`, `beat.test.ts`).

## Recommendation: GO — scope is "faithful tree + derived queries"

**Decision: adopt mdom, on one condition** — its scope must be *faithful tree +
the derived-query layer*. If mdom ships as "faithful tree + element reading"
only, it's a no-go: that just re-implements vexml's existing `src/musicxml/`
wrappers and relocates nothing.

### Why

The pain of "working with MusicXML directly" was never element reading — vexml
already wraps that in `src/musicxml/` (`NamedElement` + getters). The pain lives
in the ~5,000-line `src/parsing/` pipeline that *derives* render-usable facts:

| File | Lines | Job |
|---|---|---|
| `contexts.ts` | 938 | carry-forward state + spanner pairing + id minting, threaded through 4 nested context levels |
| `eventcalculator.ts` | 418 | linearize part-major markup into beat-stamped events |
| `signature.ts` | 410 | running clef/key/time/divisions/stave-count |
| `conversions.ts` | 369 | MusicXML → vexflow enums |

A **faithful tree alone fixes none** of MusicXML's real friction (part-major
layout, sparse carried-forward state, `number`-paired spanners, implicit chords,
divisions-based timing). What fixes it is the **query layer on top**. So judge
and scope mdom on the queries, not on tree fidelity.

### The dividing line

> **mdom owns "what the music *is*." vexml keeps "how to *draw* it."**

| "what it is" → mdom | "how to draw it" → vexml (keep) |
|---|---|
| clef/key/time/divisions/stave-count in effect | systems (line breaking) |
| beat position, duration-in-beats | fragments (split at signature change) |
| slur/tie/beam/tuplet/wedge/pedal/octave-shift pairing | continuation, minWidth, gaps |
| chord & voice grouping | vexflow enum mapping, render ids |
| transposition, pitch identity | accidental glyph codes, stem collision |

Do **not** make mdom emit `data.Score`. That type *is* a render projection
("re-imagine the markup"), which violates mdom's first principle. Keep a thin
`data.Document` projector in vexml, fed by mdom queries instead of the 5,000-line
pipeline.

### Round-trip fidelity is for editing, not for vexml

Lossless round-trip only buys anything when you write MusicXML back out. vexml
*reads*; it never serializes. So don't let the round-trip contract constrain the
query layer — grouped *views* (chords, voices) that look nothing like the markup
are fine; they sit on top of the faithful tree without violating it.

### Evidence — three spikes

Each replaced a chunk of the pipeline with a small, isolated, unit-tested query.
The win is **deleting scaffolding** (state threading, builders, 4-level
contexts, `IdProvider`), not relocating logic.

1. **Carry-forward** — `note.clef()` / `note.divisions` (~86 lines) replace
   `signature.ts`'s carry-forward + its threading through measure → fragment →
   stave. Backward scan, nearest match wins. Handles cross-measure carry,
   per-staff selection, mid-measure changes.
2. **Spanner pairing** — `slur.partner()` (~25 lines) replaces
   `contexts.ts`'s `beginCurve`/`continueCurve` (duplicated across all 4 context
   levels) + `IdProvider`. Handles cross-measure, reused `number`, and nesting.
   Ties/wedges/pedals/octave-shifts/vibratos are the *same shape*.
3. **Timeline (backup/forward)** — `note.measureBeat()` (~15 lines) is a single
   left-to-right cursor fold over one measure; `<backup>`/`<forward>` move the
   cursor, `<chord/>` notes share the prior onset. vexml does the same arithmetic
   but tangled inside the 418-line `EventCalculator`. Composes with `divisions`.

### Caveats (honest)

- **Pull-based queries are O(n²) if you resolve everything.** Per-note is fine;
  for whole-measure/whole-score, do one pass (the fold already yields every
  onset) or memoize. Don't pre-build caches before a profile asks.
- **Irreducible logic stays the same size.** Beat math and accidental carry are
  fiddly wherever they live. mdom makes them isolated, named, and tested — it
  doesn't make them shorter. The 4× shrink comes from deleting scaffolding.
- **The "mdom → MusicXML" direction stays simple for reads** (literal nodes
  round-trip; no timeline math). Only *timeline editing* needs backup/forward
  rebalancing, which is an editing-layer concern the vexml-replacement goal never
  exercises.

---

## Checklist: what mdom needs before vexml can drop its own parsing

`[x]` = done (spikes/existing). `[ ]` = to build. Scope each item by the
dividing line above; anything render-target-specific is intentionally absent.

### A. Query primitives on `MElement`
- [x] `child(tag)`, `childrenNamed(tag)`, `childrenOfType(Ctor)`, `closest(Ctor)`
- [ ] Value coercion helpers — read text/attr as `int` / `float` / `enum(set)`
      with a default, replacing scattered `Number(x?.text)` (the `Value`/`Enum`
      role from vexml `src/util`)
- [ ] `ancestor(tag)` / `next(tag)` / `previous(tag)` — **only if** a query needs
      them; typed nodes + `closest(Ctor)` cover most cases so far
- [ ] Deep `first(tag)` / `all(tag)` — **likely unneeded**; typed nodes replaced
      vexml's reliance on descendant scans. Add only on demand.

### B. Carry-forward ("signature in effect") queries
- [x] clef in effect, per staff — `note.clef()`
- [x] divisions in effect — `note.divisions`
- [ ] key in effect (fifths, mode) — `note.key()` / `measure.key(staff)`
- [ ] time in effect (beats/beat-type components, symbol, senza-misura)
- [ ] stave count in effect (`<staves>`) and stave line count
      (`<staff-details><staff-lines>`)
- [ ] generalize the backward walk (`attributesBackFrom`) so B-items share it

### C. Timeline / grouping queries
- [x] measure beat (onset) with backup/forward/chord — `note.measureBeat()`
- [ ] duration in beats — `note.beats` (`duration / divisions`)
- [ ] voice grouping — `measure.voices()` → entries per `<voice>`
- [ ] chord grouping — collapse `<chord/>` runs into one chord entry
- [ ] grace grouping — attach leading `<grace>` notes to the following entry
- [ ] multi-measure rest count (`measure-style/multiple-rest`)

### D. Spanner / relationship queries (all via the `partner()` pattern)
- [x] slurs — `slur.partner()`
- [ ] ties (`<tied>`)
- [ ] beams (`<beam>` begin/continue/end/hooks, by `number`)
- [ ] tuplets (`<tuplet>` start/stop + `<time-modification>`)
- [ ] wedges (`<wedge>` crescendo/diminuendo in `<direction>`)
- [ ] pedals (`<pedal>` start/stop/change/continue)
- [ ] octave shifts (`<octave-shift>` up/down/stop, size)
- [ ] vibratos / wavy-line (start/stop)
- [ ] factor one generic spanner resolver; the typed nodes above are thin
      wrappers over it

### E. Typed nodes + getters
Existing: `Score`, `Part`, `Measure`, `Note`, `Pitch`, `Clef`, `Slur`.
- [ ] **Note** getters still needed: `dots`, `stem`, `notehead`, `accidental`
      (code + cautionary), `isGrace`/`graceSlash`, `voice`, `isChordMember`
- [ ] **Rest** specifics: display step/octave
- [ ] **Pitch**: already has step/alter/octave ✓
- [ ] **Key** node: fifths, mode (+ derived rootNote, previousKey for cancels)
- [ ] **Time** node: components, symbol, senza-misura
- [ ] **Barline**: bar-style, repeat (direction/times), ending (number/type)
- [ ] **Direction** content: dynamics, words/annotations, metronome, segno, coda,
      rehearsal (+ the wedge/pedal/octave-shift spanners under D)
- [ ] **Harmony** (chord symbols): root (step/alter), kind (+text), bass
      (step/alter), degrees (value/alter/type)
- [ ] **Lyric**: syllabic, text, elision
- [ ] **Notations** sub-nodes as needed: articulations, ornaments, technical,
      fermata, arpeggiate, tremolo, bend, tab (fret/string), accidental-mark
- [ ] **Measure** getters: label, start/end barline style, jumps
      (repeat/ending), segno/coda markers
- [ ] **Stave/Part signature** access: stave count, line count
- [ ] Register every new typed node in the `xml.ts` registry

> Add a typed node only when a query gets painful — unknown tags still
> round-trip as plain `MElement`. The full element inventory vexml reads is in
> the conversation notes; this list is the subset that earns ergonomic access.

### F. Value/enum reading (MusicXML-native only)
- [ ] Expose native strings/enums with sensible defaults: clef sign, key mode,
      time symbol, accidental, notehead, stem, bar style, dynamic type,
      articulation types, bend type, pedal type, wedge type, degree type, chord
      kind, note (duration) type
- [ ] **Leave vexflow-target mapping in vexml** — `CurveOpening`,
      `CurveArticulation`, `EndingBracketType`, `RepetitionSymbol`, accidental
      glyph codes, etc. are render concerns, not mdom's

### G. Score header
- [ ] `score.title` (`movement-title`, fallback `work-title`)
- [ ] `score.partLabels` (`part-list` → `score-part` → `part-name`)
- [ ] `part.staveCount`

### H. Integration & mechanics
- [ ] Add `@stringsync/mdom` as a dependency of `@stringsync/vexml`
- [ ] vexml feeds an XML **string** to `MDOMParser` — drops its `new DOMParser()`
      (mdom uses `xml-js`, so parsing works headless; a quiet win)
- [ ] MXL: vexml keeps its `mxl/` zip handling and passes the decompressed XML to
      mdom (compression is packaging, not a tree concern)
- [ ] Write the thin `data.Document` **projector** in vexml — maps mdom queries →
      render structs (systems, fragments, flat spanner lists)
- [ ] Delete, once the projector is green: `src/musicxml/`, and from
      `src/parsing/musicxml/` the reading/derivation half — `contexts.ts`,
      `signature.ts`, `eventcalculator.ts`, `idprovider.ts`, the carry-forward
      parts of `conversions.ts`, and the per-element builders

### Out of scope — stays in vexml (listed so the boundary is explicit)
Systems / line breaking · fragments · continuation · minWidth · gaps /
`NonMusicalFragment` · vexflow enum mapping · render ids · accidental glyph
codes · jumps/repeat *rendering* · multi-rest *rendering* · formatting · playback.

### Suggested order
1. Finish **B** (key/time to match clef) and **C** (voice/chord grouping) — the
   `eventcalculator` + `signature` replacement.
2. Finish **D** (generic spanner) — the `contexts` replacement.
3. Add **F/G** values + **E** typed-node getters as the projector demands them.
4. Build the **H** projector against a real vexml render test; delete on green.

Drive adoption from a real vexml render fixture, not from this list top-to-bottom
— let the projector pull features in by need, so nothing speculative gets built.
