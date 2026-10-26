# MusicXML 4.0 modeling audit

Snapshot: 2026-10-26, commit `34c51d30ba7e98404aaf7faf05d3057dcd213c84`.
Task #22 audits the MusicXML API, not Guitar Pro conversion. No modeling changes
are included. The TSVs are a frozen measurement, not a live coverage scoreboard.

The largest observed gaps are metadata, instruments, page/staff layout, and text
formatting. Transpose and richer chord symbols have fewer examples but affect
musical interpretation. Guitar technique **writers** remain valuable work already
assigned to #2–#6; registration of a technical mark does not cover its nested
payload.

## Scope and method

- Schema: the vendored `packages/mdom/schema/musicxml.xsd` (MusicXML 4.0).
  Count every named `xs:element`, deduplicate by XML name, and retain its declared
  types. For each declaration, collect attributes from its named or anonymous
  complex type, recursively expanding attribute groups and complex/simple-content
  bases. Union attributes for overloaded element names. XML namespace attributes
  keep their `xml:` prefix. This is a name inventory, not a contextual validator.
- Corpus: all 28 `.xml` files in `packages/e2e/examples` at the snapshot. Exclude
  `invalid_root.xml`, `mostly_invalid.xml`, and `partially_invalid.xml`, the three
  deliberate malformed fixtures. Count 25 remaining files, including the
  LilyPond stress fixtures and W3C examples. These are not 25 independent songs
  sampled from a population. `corpus.tsv` records the complete file manifest,
  cohort, and SHA-256 checksums, including exclusions.
- Guitar/tab cohort: `wanna_skip_class.xml` (Guitar Pro) and
  `tablature_bends.xml` (guitartabcreator.com). Guitar counts are **occurrences
  across these two scores**, not percentages of guitar music in general. GP/GPX
  fixtures are outside this MusicXML input audit. Broader guitar prevalence
  cannot be estimated from these two files.
- Parse each included XML file with Python's `xml.etree.ElementTree`; count
  element instances and `(element name, attribute name)` instances, recording
  distinct files separately. Count attributes only when explicitly present;
  do not synthesize XSD defaults. Unknown names are recorded separately.
- Compare `registry.ts`, including both technical and ornament tag arrays, with
  the public surface exported by `index.ts` and implementations of parent
  getters, helpers, builders, and property setters. Follow the parent reads:
  `<scaling>`, `<part-group>`, dynamics, articulations, etc. need no dedicated
  registered class to have a semantic API.
- `typed_read` means an exported node or parent API exposes at least part of the
  element's meaning. It is **not** a claim that every child or attribute is
  covered. Structural wrappers are labeled as such. For attributes it means an
  explicit semantic getter reads that attribute in that element context.
- `intent_write` means a public musical builder, setter, or property setter can
  produce it. Constructors, `setAttribute`/`append`/`setText`, raw child queries,
  internal GPIF adapters, and copying signatures are not intent writers. A
  writer that covers only a simple form is labeled accordingly. Removing a
  typed node through generic mutation is not a creation API.
- `source_literal_candidate` is only a search aid: a matching quoted string in
  non-test MusicXML source, excluding registry, serializers and Guitar Pro
  adapters. It is not used as proof of semantic coverage. `typed_read` and
  `intent_write` reflect manual API review. Shared names (e.g. `text`, `string`,
  `part`, `duration`) have context-dependent coverage; consult the partial-gap
  table and source before implementing a task.

There are **442 schema element names**, **85 registered tags**, and **2,097
schema element/attribute-name pairs**. The corpus contains **202 element names**
and **147 element/attribute pairs**. All observed names fit the schema's name
inventory (`outside-schema.tsv` has no data rows); this does not prove that each
file validates in context.

At element-name granularity, **192 names have no semantic read**, and **192 have
neither a semantic read nor an intent writer**, of which **68 occur in the
corpus**. Playback `<tie>` is among those gaps: `Note.addTie` writes only notation
`<tied>`, not the separate playback element. **1,950 schema attribute pairs have neither
API**, of which **96 occur in the corpus**. Many absent attributes are shared
print-style fields repeated across element names; these are not 1,950 distinct
features to implement.

## Evidence files

| File | Contents |
| --- | --- |
| [elements.tsv](elements.tsv) | Every schema element name, registry/search evidence, read/write coverage, occurrence/file counts, guitar count, observed parents |
| [attributes.tsv](attributes.tsv) | Every schema element/attribute pair, counts, read/write coverage |
| [gaps-elements.tsv](gaps-elements.tsv) | Exact subset with neither API; sorted by files descending, then occurrences descending, then name |
| [gaps-attributes.tsv](gaps-attributes.tsv) | Same filter and ranking for attributes, including attributes on registered nodes |
| [corpus.tsv](corpus.tsv) | Frozen file manifest, cohort and checksums |
| [outside-schema.tsv](outside-schema.tsv) | Observed names absent from the schema name inventory |

Zero counts are retained, so unexercised MusicXML 4.0 corners remain visible.
Full inventories distinguish read-only and write-only coverage; the two gap
files deliberately contain only entries missing **both** APIs. A `yes` attribute
writer may be an existing property setter, rather than a builder option.

## Observed gaps ranked by spread across files

Counts below describe individual representative fields, not sums across rows or
unioned family counts. `Occurrences / files` uses the 25-file corpus; the last
count uses only the two guitar/tab scores. The gap TSVs provide the exhaustive
ordering, including lower-ranked and zero-count entries.

| Rank | Area and representative gap | Occurrences / files | Guitar/tab occurrences | Follow-up |
| --- | --- | ---: | ---: | --- |
| 1 | Encoding: `supports`; `encoding-date` | 41 / 11; 11 / 11 | 6; 2 | #25 metadata |
| 2 | Miscellaneous metadata: `miscellaneous-field/@name` | 11 / 11 | 0 | #25 |
| 3 | Page layout: `page-layout`, `page-height`, `page-width` (each) | 16 / 10 | 3 | #27 page layout |
| 4 | Instruments: `score-instrument`, `instrument-name` (each) | 29 / 8 | 1 | #26 instrument metadata |
| 5 | MIDI channel | 29 / 8 | 2 | #26 |
| 6 | Part abbreviations | 29 / 8 | 2 | #25 |
| 7 | Page margins (`page-margins`, top/bottom each) | 17 / 8 | 2 | #27 |
| 8 | MIDI `volume`, `pan` (each) | 28 / 7 | 2 | #26 |
| 9 | Creators and creator role | 8 / 6 | 1 | #25 |
| 10 | Default word font | 6 / 6 | 1 | #29 typography |
| 11 | Staff layout/distance (each) | 71 / 5 | 1 | #28 staff/appearance |
| 12 | Appearance line width and its type | 59 / 5 | 10 | #28 |
| 13 | Credits and credit text (each) | 13 / 5 | 0 | #25 |
| 14 | Appearance note size and its type | 10 / 5 | 2 | #28 |
| 15 | Default music font | 5 / 5 | 1 | #29 |
| 16 | Print measure numbering | 25 / 4 | 1 | #27 |
| 17 | Default lyric font | 4 / 4 | 0 | #29 |
| 18 | Transpose: diatonic/chromatic (each); transpose block | 10 / 3; 9 / 3 | 1; 1 | #31 transposition |
| 19 | Appearance distance | 6 / 3 | 2 | #28 |
| 20 | MIDI device; instrument sound (each) | 3 / 3 | 0; 1 | #26 |
| 21 | Rights | 3 / 3 | 0 | #25 |
| 22 | Per-note instrument identity | 249 / 2 | 0 | #26 |
| 23 | Display-name runs: `display-text` | 4 / 2 | 0 | #25 |
| 24 | Harmony degree/value/alter/type (each) | 5 / 1 | 0 | #32 chord extensions |
| 25 | Other direction text; other notation | 3 / 1; 1 / 1 | 0; 0 | #35 nested marks |
| 26 | Concert-score/for-part/part-clef/part-transpose (each) | 1 / 1 | 0 | #31 |
| 27 | Cue marker | 1 / 1 | 0 | #35 |
| 28 | Slash measure style | 1 / 1 | 0 | #33 measure styles |

### Attributes hidden by otherwise typed nodes

These are missing reads and intent writes even when the containing tag is
registered. Raw attributes still survive serialization.

| Gap | Occurrences / files | Guitar/tab occurrences | Follow-up |
| --- | ---: | ---: | --- |
| `note/@default-x` | 2,118 / 8 | 0 | #30 geometry |
| `stem/@default-y` | 1,609 / 4 | 0 | #30 |
| `dynamics/@default-y`; `@default-x` | 226 / 2; 225 / 1 | 0; 0 | #30 |
| `slur/@default-x`, `@default-y` (each) | 96 / 2 | 0 | #30 |
| `slur/@bezier-x`, `@bezier-y` (each) | 90 / 2 | 0 | #30 |
| `note/@default-y` | 27 / 3 | 0 | #30 |
| Articulation `accent/@placement` | 13 / 3 | 0 | #35 |
| `type/@size` | 9 / 2 | 0 | #30 |
| `direction/@directive` | 3 / 2 | 1 | #36 playback/direction semantics |
| `note/@print-spacing` | 303 / 1 | 0 | #30 |
| `wedge/@spread` | 198 / 1 | 0 | #30 |
| `offset/@sound` | 43 / 1 | 0 | #36 |
| `words/@halign`; `@font-size` | 13 / 1; 8 / 1 | 0; 0 | #29 |
| `note/@dynamics` | 6 / 1 | 0 | #36 |
| `print/@page-number` | 4 / 1 | 0 | #27 |

Root `score-partwise/@version` occurs in all 25 files and has no semantic getter
or configurable intent setter; empty-document construction supplies a fixed
version. Treat it as metadata (#25), not as 25 failures of musical modeling.

## Partial reads and missing writers

These must not be counted as wholly unmodeled elements. Counts again describe
individual fields, and zero means no evidence in this snapshot.

| Existing API | What remains missing | Evidence | Existing/new task |
| --- | --- | --- | --- |
| `Note.bend`, `Note.isHarmonic`, `Technical.technicalType` | Pre-bend, harmonic subtype and pitch nodes; structured nested payloads; technique writers | Bend 4 / 1, all 4 guitar; pre-bend and harmonic 0 | Existing #2; nested reads #35 |
| Hammer-on/slide/etc. typed spanners | Intent writers for these pairs | Hammer-on 24 / 1, slide 10 / 1, all guitar | Existing #3 |
| `Lyric.runs`, `syllabic`, `extend` | Intent writing, per-run format, extend type rather than presence | Lyric 12 / 2; extend 0 | Existing #4; #29, #35 |
| `Barline.ending`, repeat reads and `addBarline` | Ending text read; navigation sound routing reads/writes | Ending 5 / 1; direction segno/coda each 1 / 1 | Existing #5; #35, #36 |
| `Note.fermata`, `arpeggiate`, `Ornament.tremoloMarks` | Fermata shape, arpeggio group number; beat-effect writers | Tremolo 14 / 1; fermata/arpeggiate 0 | Existing #6; #35 |
| `Note.ties` exposes notation `<tied>` | Separate playback `<tie>` reads and intent writes; retain distinction | Tie and tied each 186 / 1 | #36; `addTie` currently writes only tied |
| `Note.articulations`, `Dynamics.marks` | Articulation attributes/payloads beyond tag names; `other-notation` | Accent 13 / 3; other-notation 1 / 1 | #35; basic tag writers already exist |
| `Harmony.root/kind/bass/frame` | Degrees, inversion/function/numeral, staff/offset, kind display fields | Degree each 5 / 1; other forms 0 | #32 |
| `Frame` and `FrameNote` reads/builders | Fingering, first-fret text/location and other display details | Frame 0 | #35; GP conversion separately #14 |
| `StaffDetails`/`StaffTuning` | Intent builders; staff type and additional declaration attributes | Staff-details 79 / 5, tuning 12 / 2 (all 12 guitar) | #28 |
| `Key.alterations`, `Time.components/isSenzaMisura` | Intent writers for nontraditional/composite/unmetered forms, cancel/interchangeable reads | Key-step/alter each 7 / 1; senza-misura 1 / 1 | #34 |
| `Note.timeModification`, `Tuplet.actual/normal` | Normal type/dots; intent writers and duration-aware tuplet construction | Time-modification 10 / 1, tuplet 4 / 1 | #34 |
| `Measure.getMultiRestCount` | Other measure styles and style intent writers | Slash 1 / 1, multiple-rest 0 | #33 |
| `Sound.tempo/dynamics/swing` | Navigation, detailed performance/automation fields | Sound 255 / 6, 2 guitar; navigation attrs 0 | #36; GP tempo conversion separately #13 |
| `Metronome.beatUnits/relation` | Tied beat units, relation operator, tied notes/arrows and detailed tuplet display; complex-form writers | Simple metronome 5 / 3, 1 guitar; complex forms 0 | #34 |

Scaling, system margins/distances, print breaks, core pitch/duration, string/fret,
basic chord symbols/frames, part groups and basic barline repeats already have
usable APIs. Their child tags must not be counted as gaps merely because they
are absent from the registry. Some also have writers through property setters.

## Priorities and follow-up tasks

Guitar-specific priority comes from musical consequences plus the two observed
scores, not an invented global frequency. Retain existing #2 (techniques), #3
(legato/slides), #4 (lyrics), #5 (navigation), and #6 (beat marks). In the new
work, instrument assignments (#26), staff/tuning builders (#28), transpose (#31),
rich chords (#32), and tuplets (#34) matter before export-coordinate fidelity
(#30), despite the latter's high instance counts.

Twelve new tasks were added to **lane 4**, grouped by area in their subjects:

| Area | Tasks |
| --- | --- |
| Metadata/instruments | #25 score credits/encoding; #26 instrument identities/MIDI |
| Layout/text/engraving | #27 page layout; #28 staff spacing/appearance; #29 fonts/text; #30 positions/spanner geometry |
| Signatures/harmony/rhythm | #31 transpose; #32 chord extensions; #33 measure styles; #34 tuplets/complex signature writers |
| Notation/playback details | #35 nested mark reads; #36 navigation/performance attributes |

They depend on this audit so its evidence exists before they start. They are
linked in sequence because their exported models share `index.ts`, registry,
and parent accessors; #35 also waits for #2/#4/#6, and #36 for #5. This ordering
is a file/API dependency, not a prevalence ranking. No duplicate GP conversion
tasks were added.

Zero-evidence families remain listed in the inventories, but do not each warrant
a task now: accordion/harp/percussion direction payloads, scordatura, image/link/
bookmark/grouping/listening, detailed play/sync automation, and score-timewise
structure. The last is a different score organization, not a missing field on
Score's partwise API. Likewise root XML version and source provenance have low
musical urgency despite wide presence. Reassess these with additional real
scores; this audit makes no claim about corpus additions from concurrent #20/#21.

## Verification

- Independent XML name/attribute counts include all 25 manifest scores and retain
  zero-count schema entries; 442 unique element rows and 2,097 unique attribute
  rows; each gap file is exactly the corresponding both-APIs-missing subset.
- SHA-256 checksums identify the input bytes. Element counts and attribute counts
  can be reproduced from that manifest using the algorithm above; API judgments
  are tied to the source commit and require review when the API changes.
- `./bin/mdom test packages/e2e/compatibility.test.ts`: 25 passed, 0 failed.
  This checks parse/serialize idempotence across the snapshot corpus. Source
  review of parser `build`, registry `elementFor`, and serializer attribute/child
  handling establishes generic preservation of unmodeled names and attributes.
  Idempotence alone would not prove no data was lost on the first parse.
- Independently compared the original and first serialized XML with ElementTree:
  all 25 trees retain every element, attribute and non-whitespace text run,
  including the unmodeled data. This closes the first-parse loss blind spot of
  idempotence testing.
- `./bin/mdom fix`: Biome and TypeScript passed; no fixes applied.
- No byte-for-byte round-trip claim: comments/formatting whitespace and some
  doctype content are intentionally dropped by the parser. Preserved in this
  report means element/attribute data retained in the generic tree, not exact
  source formatting.
