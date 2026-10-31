---
description: Performance audit of operation scaling, cache invalidation, tree construction, cursor traversal, and history retention at 108386d.
---

# Performance audit, 2026-10-26

Audit baseline: `108386d6bcdbbd3d5b657347a37ecb6236319224`.
GP import/export and edit-then-read loops grow roughly quadratically on the
measured inputs. Dense cursor walks also become superlinear. Pitch-history
retention stays constant per entry. Five fixes are prioritized below; this audit
changes no library behavior. All file:line references describe the baseline
unless a later commit is named.

## Scope and interpretation

The full default benchmark covers twelve operations at 100, 200, 400, and 800
measures, with three samples in separate sequential processes per case. The XML
seed is `21d-Chords-SchubertStabatMater.xml`; GP operations use `notes.gp`.
These have different contents, so compare growth within an operation.
Environment: Bun 1.4.4, macOS arm64, Apple M4 Max, 64 GiB RAM. This was a shared
development host, not an isolated performance lab; use growth trends and source
evidence rather than treating these latencies as production guarantees.
GP import prepares its archive by exporting the generated score outside the
timer. End-to-end sample wall time therefore includes GP export and cannot be
reported as import latency. Profiles also include setup; attribute frames to
the operation's call path rather than treating the whole profile as timed work.

Retained JS heap after GC is neither peak allocation nor RSS. Small signed heap
deltas are noisy. A ratio over three is a lead, not proof of a complexity bound.
The runtime's `--heap-prof` writes an exit heap snapshot, not an allocation-site
sample profile. Objects that were live for the benchmark's after-GC reading may
already be dead by exit; those snapshots cannot establish peak or per-operation
retention alone. See [Bun's profiling documentation](https://bun.sh/docs/project/benchmarking).
The default edit count grows with notes; fixed-edit runs are needed to distinguish
score-size cost from edit-count cost. The generator closes spans and resets seed
attributes each cycle, so it cannot expose every malformed-span or sparse-signature
case. A measure-axis run does not establish linearity in density or part count.

In the static estimates below, P is parts, M is measures per part, L is direct
children/notes per measure at fixed note shape, k is edits, S is spanner markers,
and A is tempo automations. A representative orchestra is 20 parts × 500 measures;
counts are estimates of work or retained references, not measured milliseconds.

## Measurements

Commands and raw samples are preserved in artifact `mdom-perf-audit-evidence.json`.
The baseline command was:

```sh
bun packages/e2e/scaling.bench.ts --json /tmp/mdom-perf-audit-scaling.json
```

All 48 cases succeeded (144 fresh-process samples). The five supplemental
matrices below add 66 fresh-process samples; seven single-case runs collected
CPU profiles and exit heap snapshots. Those instrumented runs do not replace
the timing medians. XML cases contain 450–3,600 note/rest events; GP cases contain
3,500–28,000 (28 pitched notes plus seven rests per measure), always one part.

### Full measure-axis matrix

Medians of three fresh-process samples. Times are milliseconds; ratios compare adjacent doublings.

| Operation | 100 | 200 | 400 | 800 | Time ratios: 200/100, 400/200, 800/400 |
| --- | ---: | ---: | ---: | ---: | --- |
| parse | 11.5 | 26.4 | 61.6 | 140.0 | 2.30, 2.33, 2.27 |
| mxl-unzip | 3.7 | 4.4 | 4.9 | 6.2 | 1.21, 1.10, 1.27 |
| gp-parse | 2534.6 | 9793.8 | 41847.9 | 191078.0 | 3.86, 4.27, 4.57 |
| serialize-xml | 2.3 | 4.0 | 8.3 | 16.6 | 1.72, 2.10, 2.00 |
| serialize-mxl | 8.2 | 11.9 | 19.6 | 31.4 | 1.44, 1.65, 1.60 |
| serialize-gp | 7887.9 | 47483.3 | 200971.6 | 922951.9 | 6.02, 4.23, 4.59 |
| read-walk | 2.4 | 4.1 | 6.4 | 12.8 | 1.70, 1.57, 2.00 |
| cursor | 2.7 | 4.9 | 8.1 | 18.5 | 1.81, 1.65, 2.29 |
| edit-insert-read | 31.9 | 103.3 | 374.6 | 1515.0 | 3.24, 3.63, 4.04 |
| edit-remove-read | 15.2 | 59.0 | 223.6 | 830.7 | 3.88, 3.79, 3.72 |
| edit-set-read | 19.0 | 68.6 | 253.3 | 945.5 | 3.62, 3.69, 3.73 |
| history | 4.7 | 7.8 | 13.4 | 25.2 | 1.66, 1.72, 1.88 |

| Operation | Retained heap delta MiB: 100 / 200 / 400 / 800 | Heap ratios | Document heap MiB: 100 / 200 / 400 / 800 | Document ratios | Flagged sizes |
| --- | --- | --- | --- | --- | --- |
| parse | 2.011 / 4.016 / 7.929 / 15.870 | 2.00, 1.97, 2.00 | 0.459 / 0.837 / 0.518 / 0.947 | 1.82, 0.62, 1.83 | n/a |
| mxl-unzip | 0.788 / 1.013 / 1.587 / 2.768 | 1.29, 1.57, 1.74 | 0.454 / 0.840 / 0.520 / 0.922 | 1.85, 0.62, 1.77 | n/a |
| gp-parse | 39.917 / 134.187 / 266.400 / 317.191 | 3.36, 1.99, 1.19 | 3.991 / 7.950 / 86.753 / 173.551 | 1.99, 10.91, 2.00 | 200, 400, 800 |
| serialize-xml | 0.261 / 0.504 / 0.998 / 2.000 | 1.93, 1.98, 2.00 | 0.453 / 0.834 / 0.514 / 0.949 | 1.84, 0.62, 1.84 | n/a |
| serialize-mxl | 0.705 / 0.672 / 0.662 / 0.196 | 0.95, 0.99, 0.30 | 0.452 / 0.837 / 0.519 / 0.947 | 1.85, 0.62, 1.82 | n/a |
| serialize-gp | 2.592 / 2.739 / 20.096 / 40.422 | 1.06, 7.34, 2.01 | 3.989 / 7.949 / 86.764 / 173.556 | 1.99, 10.91, 2.00 | 200, 400, 800 |
| read-walk | 0.289 / 0.405 / 0.629 / 1.007 | 1.40, 1.55, 1.60 | 0.451 / 0.836 / 0.517 / 0.948 | 1.85, 0.62, 1.83 | n/a |
| cursor | 0.288 / 0.384 / 0.603 / 0.955 | 1.34, 1.57, 1.58 | 0.452 / 0.837 / 0.517 / 0.950 | 1.85, 0.62, 1.84 | n/a |
| edit-insert-read | 1.418 / 2.673 / 5.152 / 10.004 | 1.88, 1.93, 1.94 | 0.452 / 0.836 / 0.516 / 0.953 | 1.85, 0.62, 1.85 | 200, 400, 800 |
| edit-remove-read | 0.103 / 0.123 / 0.165 / 0.150 | 1.20, 1.34, 0.91 | 0.452 / 0.839 / 0.521 / 0.950 | 1.86, 0.62, 1.82 | 200, 400, 800 |
| edit-set-read | 0.059 / 0.011 / -0.079 / -0.358 | 0.19, n/a,, | 0.452 / 0.837 / 0.519 / 0.952 | 1.85, 0.62, 1.83 | 200, 400, 800 |
| history | 3.258 / 6.328 / 12.462 / 24.748 | 1.94, 1.97, 1.99 | 0.451 / 0.838 / 0.516 / 0.950 | 1.86, 0.62, 1.84 | n/a |

### Actual baseline inputs

| Family | Parts | Notes at 100 / 200 / 400 / 800 |
| --- | ---: | --- |
| XML | 1 | 450 / 900 / 1800 / 3600 |
| GP | 1 | 3500 / 7000 / 14000 / 28000 |

### History phases and retention

| Measures | Entries | Edit ms | Undo ms | Redo ms | Retained bytes/entry |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 450 | 3.6 | 0.6 | 0.4 | 7287.3 |
| 200 | 900 | 6.3 | 1.0 | 0.7 | 7298.0 |
| 400 | 1800 | 10.8 | 1.4 | 1.2 | 7309.8 |
| 800 | 3600 | 19.7 | 3.1 | 2.3 | 7313.7 |

### Dense cursor

Operation: cursor; axis: notes; three fresh-process samples.

| Size | Work units | ms | Time ratio | Heap delta MiB | Heap ratio | Doc heap ratio | History bytes/entry |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 256 | 2.5 | n/a | 0.237 | n/a |, | n/a |
| 16 | 512 | 5.5 | 2.17 | 0.299 | 1.26 | 2.03 | n/a |
| 32 | 1024 | 16.3 | 2.96 | 0.302 | 1.01 | 1.45 | n/a |
| 64 | 2048 | 66.2 | 4.07 | 0.529 | 1.75 | 1.88 | n/a |
| 128 | 4096 | 329.1 | 4.97 | 0.565 | 1.07 | 1.77 | n/a |

### Dense read

Operation: read-walk; axis: notes; three fresh-process samples.

| Size | Work units | ms | Time ratio | Heap delta MiB | Heap ratio | Doc heap ratio | History bytes/entry |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 256 | 2.8 | n/a | 0.288 | n/a |, | n/a |
| 16 | 512 | 3.9 | 1.38 | 0.353 | 1.23 | 2.02 | n/a |
| 32 | 1024 | 6.5 | 1.67 | 0.349 | 0.99 | 1.45 | n/a |
| 64 | 2048 | 13.6 | 2.10 | 0.582 | 1.66 | 1.88 | n/a |
| 128 | 4096 | 30.6 | 2.25 | 0.598 | 1.03 | 1.78 | n/a |

### Fixed edit count

Operation: edit-set-read; axis: measures; three fresh-process samples.

| Size | Work units | ms | Time ratio | Heap delta MiB | Heap ratio | Doc heap ratio | History bytes/entry |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 100 | 4.3 | n/a | 0.110 | n/a |, | n/a |
| 200 | 100 | 7.4 | 1.73 | 0.113 | 1.03 | 1.64 | n/a |
| 400 | 100 | 13.7 | 1.84 | 0.141 | 1.25 | 1.92 | n/a |
| 800 | 100 | 24.3 | 1.78 | 0.154 | 1.09 | 1.77 | n/a |

### Fixed history count

Operation: history; axis: measures; three fresh-process samples.

| Size | Work units | ms | Time ratio | Heap delta MiB | Heap ratio | Doc heap ratio | History bytes/entry |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 1000 | 7.9 | n/a | 7.062 | n/a |, | 7183.4 |
| 200 | 1000 | 8.3 | 1.04 | 7.067 | 1.00 | 1.63 | 7183.4 |
| 400 | 1000 | 8.2 | 0.99 | 7.050 | 1.00 | 1.92 | 7183.4 |
| 800 | 1000 | 8.4 | 1.03 | 7.055 | 1.00 | 1.78 | 7183.4 |

### Growing edit count

Operation: edit-set-read; axis: measures; three fresh-process samples.

| Size | Work units | ms | Time ratio | Heap delta MiB | Heap ratio | Doc heap ratio | History bytes/entry |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 400 | 14.2 | n/a | 0.145 | n/a |, | n/a |
| 200 | 800 | 48.5 | 3.43 | 0.188 | 1.30 | 1.65 | n/a |
| 400 | 1600 | 175.4 | 3.61 | 0.207 | 1.10 | 1.88 | n/a |
| 800 | 3200 | 660.6 | 3.77 | 0.230 | 1.11 | 1.78 | n/a |

### What the measurements establish

- GP import grows 3.86×, 4.27× and 4.57× per doubling; export grows 6.02×,
  4.23× and 4.59×. At 800 measures their medians are 191.1 s and 923.0 s.
  These are timed operations, excluding input preparation.
- Default edit/insert, edit/remove and edit/set followed by a read have last
  doubling ratios 4.04×, 3.72× and 3.73×. Fixed 100-edit runs still get slower
  as the score grows (4.3 → 24.3 ms), while increasing both edits and measures
  yields approximately quadratic growth. This supports O(k M), not just more
  edits in larger inputs.
- At 32 measures, dense cursor time reaches 329.1 ms at 128 notes per measure;
  its last two ratios are 4.07× and 4.97×. The default measure-axis cursor
  and the dense read walk never exceed three, but the static boundary-copying
  and local-prefix costs still exist. The tested range does not prove a cubic
  timing curve; that bound comes from the nested source loops.
- Pitch history retains 7,287–7,314 bytes per entry in the default matrix.
  Exactly 1,000 synthetic edits retain 7,183.4 bytes per entry at every size,
  with 7.9–8.4 ms total edit/undo/redo time. The whole-score snapshot hypothesis
  is rejected for this workload. Structural history is a different case below.
- No other operation crosses the three-times threshold on the measured axis.
  XML parsing still has a statically quadratic wide-parent path despite its
  observed 2.27–2.33× ratios. Absence of a flag is not a complexity proof.

### Heap findings and limits

The retained output tree for XML parsing doubles almost exactly (2.01 → 15.87
MiB over an eightfold input). Pitch-history retention also scales with entries.
Edit/set deltas become negative; do not compute growth ratios from those values.

GP has heap flags, but not a demonstrated superlinear retained structure:
import delta rises 3.36× at 200, then 1.99× and 1.19×; export delta rises 7.34×
at 400, then 2.01×. Both operations' **untimed input-document delta** jumps
10.91× from 200 to 400, then doubles. That shared discontinuity occurs before
these different timed operations. XML's input-document delta also drops at 400,
while the separate parsed-output delta keeps doubling.

These are differences between whole-process after-GC readings, not object-graph
sizes. They can include changing temporary-root lifetimes; the exact cause of
this discontinuity is unresolved. Bun 1.4.4 reports the size recorded at the
last collection ([runtime implementation](https://github.com/oven-sh/bun/blob/bun-v1.4.4/src/jsc/bindings/BunProcess.cpp#L3953-L3962)).
Do not label the jump a library memory leak or enable a blanket heap-ratio guard.
#43 now includes stabilizing rooted measurement boundaries before such guards.

The seven exit snapshots were inspected by node type and shallow size. For
example, GP import/export at 200 contain about 763,000/534,000 nodes and
145,539/117,063 arrays, respectively. They include setup/runtime objects and do
not isolate live operation outputs; most application objects have generic names.
No dominator or two-size live-retention comparison was collected. Consequently
these snapshots support allocation-heavy tree/array investigation but do not
resolve the discontinuity or establish peak memory. The temporary sibling copies
in #46 and cache/table rebuilding in #45/#66 are CPU-supported allocation costs.

### CPU attribution

Profiles include startup, input generation and explicit GC. Counts below are
CPU samples, not wall-clock percentages. Async boundaries and inlining omit some
callers, so attribution uses identifiable source subtrees as well as the timed
operation's entry point. GP import also includes a tiny original-seed import;
its large setup export is excluded from import attribution.

| Profile | Evidence | Finding |
| --- | --- | --- |
| GP import, 200 | 5,526 samples under GPIF MDOM parsing; 4,645 (84% of that subtree) self samples in `freeze`; only 186 under `GuitarProDocumentReader.read` | Wide GPIF child construction dominates identifiable import work (#46). Setup export accounts for 21,968 samples and must not be called import time. |
| GP export, 200 | 15,958 of 23,433 total samples (68.1%) under writer `directions`; filtering and child lookup are its largest self frames | Earlier-measure direction rescans dominate (#66). `freeze` also has 5,390 self samples under the writer; source caches and output construction both allocate. |
| Insert/read, 200 | 39 samples under `carriedInto`, 23 under `measureIndexIn`, of 150 total | Carry tables and indexes rebuilt after edits (#45). |
| Remove/read, 200 | 23 under `carriedInto`, 14 under `measureIndexIn`, of 113 total | Same invalidation cause (#45). |
| Set/read, 200 | 26 under `carriedInto`, 15 under `measureIndexIn`, of 121 total | Same invalidation cause (#45). |
| Growing synthetic set/read, 800 | 250 under `carriedInto`, 180 under `measureIndexIn`, of 617 total | Larger corroborating sample for O(k M) rebuilding (#45). |
| Dense cursor, 128 notes × 32 measures | 210 samples under `cursorWalk`; 49 self samples in `indexOf`, 42 in `attributeBackFrom`; repeated `stopsIn`/chord construction visible | Local note positions, signatures and cursor stops need indexes (#47). |

Direct reproduction of a profiled baseline case uses
`bun --cpu-prof --heap-prof packages/e2e/scaling.bench.ts --operation <operation> --size 200 --samples 1`.
Supplemental commands use the same harness with `--operation edit-set-read
--synthetic --edits 100`, the same without `--edits`, `--operation history
--synthetic --edits 1000`, or `--operation cursor` / `--operation read-walk`
with `--axis notes --base 8 --steps 5 --measures 32`. Exact arguments are in the
artifact manifest. Run expensive reproductions only with the repository's
run-command approval.

## Causes and fixes

### Global cache invalidation repeats whole-part work

`read-cache.ts:15` keys every cache to the process-wide `MMutation.epoch`.
`m-mutation.ts:137` increments it for each applied write, even to an unattached
builder or a different document; `restore` increments it on undo/redo.
`signature.ts:83` refills carry tables through the requested measure;
`part.ts:390` rebuilds measure indexes after invalidation.

Editing one pitch then reading a far-end inherited signature costs O(M L) per
edit, or O(k M L). When k grows with score size this is quadratic. A 1,000-edit
session at measure 500 can revisit roughly 500,000 measures for one signature
alone; rereading twenty parts multiplies that estimate by twenty. A declaration
in the queried measure can bypass this path. The default XML seed repeats two
measures, with a key in the first and none in the second. The last measure of
each even-size case therefore rebuilds the carry table through the whole part
after invalidation, even though the preceding key is only one measure away.
Cold forward filling can cost more than a backward search to the nearest change.

GP export interleaves reads of the source with writes to a different, output tree
(`guitar-pro-score-writer.ts:96`, `:378`, `:435`). These writes repeatedly discard
source indexes, signature carries, and timeline caches. No edit to the source is
needed to trigger the behavior. Parsing another score has the same cross-document
effect. Scope cache versions to the owning document and then to structural and
musical dependencies; preserve correctness for moves, detached nodes, undo/redo,
mid-measure changes, and negative/null cache results.

### Growing child arrays make construction quadratic

`m-node.ts:191` spreads the existing frozen child list on every insertion;
`m-dom-parser.ts:94` appends every parsed child through this path. Building F
siblings therefore copies F(F−1)/2 references. The general cost is
O(sum of squared sibling counts), plus subtree adoption traversal; at fixed depth
MusicXML parts contribute O(P M²), and dense measures contribute O(P M L²).

A 20-part, 500-measure score copies about 2.5 million part-child references during
one import, apart from note children. Flat GPIF tables are worse: 40,000 entries
in one table imply about 800 million copied references. `GuitarProParser` parses
GPIF through the same MDOM parser (`guitar-pro-parser.ts:56`); the writer also
appends entries one at a time (`guitar-pro-score-writer.ts:194`). These temporary
copies can consume CPU without surviving the after-GC heap measurement.

Use bulk construction or an internal append builder that publishes the immutable
children view once, preserving ownership, barline repair, and history semantics.
Avoid weakening public immutability to optimize an import-only path.

### Cursor walks repeatedly scan and copy

`cursor.ts:114` finds the current measure and slices the rest of the part at every
boundary. A walk through M nonempty measures copies M(M−1)/2 references per
voice, even when it only uses the first item in each slice. A 20-part, 500-measure,
single-voice walk copies about 2.5 million references, plus index searches.
An indexed or lazy measure traversal can remove this O(P V M²) work.

Within a measure, `cursor.ts:70` and `:90` rebuild voice chord stops and search
from the start on every move. Each predicate reads `Note.measureBeat`, which
calls `divisions` and scans the child prefix (`note.ts:205`, `signature.ts:60`).
For one voice with L ordinary notes, a full dense-measure walk can therefore be
O(L³), not just O(L²). With 64 notes, the nested prefix sums alone are roughly
46,000 child visits per measure, versus about 120 with eight notes, before the
separate `indexOf` and chord construction costs. Index onsets/stops per measure
and reuse them while their musical dependencies are unchanged. Preserve gaps,
chords, staff/voice handling, and live cursor behavior after edits.

### Per-note signatures still rescan the current measure

The part-level carry cache makes earlier-measure lookup amortized linear across
a read-only walk. It does not index a note's position or the preceding attributes
within its own measure. `note.ts:208`, `:984` and `signature.ts:60` give O(L)
lookup per note, even after the cache is warm. Reading all notes is O(P M L²).
The default measure-axis benchmark keeps L bounded and cannot reveal this.
At 20 × 500 measures with 64 notes each, one prefix scan per note is approximately
20.8 million child visits; the read walk requests divisions multiple times.
Build per-measure positions and signature change points, retaining the existing
staff selection and mid-measure semantics. This shares dependencies with the
cursor fix but is independently useful to renderers and serializers.

### GP directions and bar tables are repeatedly rediscovered

`guitar-pro-score-writer.ts:651` walks `part.measures.slice(0, index + 1)`
for every emitted beat, then filters every measure's directions and reads staff,
dynamic marks and words again. There are O(P M² L) measure visits for L beats
per measure, each also filtering the measure's children. If child count grows
with L this contributes O(P M² L²), before additional direction/onset work.
It is quadratic in M at fixed measure shape, even with no useful directions. A 20-part, 500-measure score with four beats per measure revisits
roughly ten million measures, before examining their contents. The 68.1% profile
subtree makes this a measured priority, independently of cache invalidation.

Build an export-pass direction index or carry state by part/staff/onset, and
advance it through sequential beats. Preserve inherited dynamics, same-onset
ordering, free text and unsupported-feature validation. A source cache discarded
by output writes would not solve this; use export-owned state or #45's scoping.
#66 groups this with the related GP event/table scans below.

`guitar-pro-score-writer.ts:408` and `:420` filter the whole MasterBars table
twice per emitted bar. This remains O(P M²) even after source-cache invalidation
is fixed. Store the generated master bars by index rather than rediscovering them.

`guitar-pro-document-reader.ts:326` scans all A master automations for each
measure of every part: O(P M A), quadratic when tempo automation count grows
with M. At 20 parts, 500 measures, and 500 tempo events this is five million
event checks. Group automations by bar once, preserving order and unsupported
feature validation. A score with one initial tempo does not expose this bound.
Post-baseline `606a758` parses/sorts tempo changes once but still filters the
whole list per measure, so the O(P M A) lookup remains. #66 must preserve its
mid-measure and gradual-tempo semantics. Later beat-effect export also filters
MasterBars per chord, increasing the value of direct references.

### History stores field changes, but structural snapshots scale with siblings

`m-history.ts:47` creates one mutation record per edit. `m-mutation.ts:117`
stores before/after values only for fields that changed. Pitch edits do not
snapshot the whole score, so the original whole-document-history hypothesis
does not follow from the implementation.

Structural mutations do retain entire before/after child arrays for each changed
parent (`m-node.ts:218`). Across k successive edits to a stable F-child parent,
distinct versions retain O(k F) references; adjacent entries share an intervening
array, so do not count two new arrays per edit. Appending 1,000 measures to a part
that starts at 500 retains about one million child references across versions,
roughly 4–8 MB of reference slots alone depending on runtime representation, plus
nodes, arrays, and mutation records. Pitch edits touch bounded-size parents;
ordinary note edits depend on measure density rather than total score length.
If structural history is optimized, use identity-preserving splice records or a
persistent sequence, with transaction rollback and move replay tests. This is a
separate workload from the benchmark's pitch-only `history` case.

### Spanner creation rescans the part to allocate each number

`note.ts:1124` rebuilds the set of all used numbers by scanning every note in
the part, then searches for the lowest unused number starting at one. `spanTo`
(`note.ts:992`) uses it for each tie/slur, and tuplet creation also uses it.
Adding k spans to a part with N notes costs O(k N + k²) as used numbers grow.
`guitar-pro-document-reader.ts:576` calls `origin.addTie(note)` for every imported
tie destination, making this an import cost as well as an editor cost.

For 20 parts × 500 measures × four notes with one new tie per measure, a growing
import scans about ten million note entries just for allocation, plus about
2.5 million candidate-number probes. A 1,000-span editing session on existing
2,000-note parts scans about two million note entries. These are static estimates;
the default `notes.gp` fixture has no Tie elements and cannot measure this path.
The existing harness can exercise it with `--operation gp-parse --synthetic`,
whose generated score has a tie pair in each measure.

Maintain allocation state per part and marker kind, or use a bulk-import
allocation context, preserving lowest-unused numbering and collision handling.
Raw marker edits, removals, moves, and undo/redo must update or invalidate the
state correctly. A memo that is discarded after every added span would leave
the quadratic cost intact.

Post-baseline change: `c3e4407` now reuses numbers across non-overlapping spans.
Its allocator still flattens and scans the part per call, retaining O(k N) work.
The baseline's k² candidate-number estimate no longer describes sequential
spans under that policy. #49 must preserve the new overlap-aware reuse behavior.

## Other patterns and limits

- Spanner partner lists and pairings are cached (`spanner.ts:136`, `:169`). Normal
  fixed-width spans do not trigger a full-part scan per partner. Pairing includes
  a sort, O(S log S) in the general ordering case. `openerFor` scans all outstanding
  starts of a number, and `splice` removes the selected one (`:193`, `:222`), so
  many unmatched/reused starts followed by closes can be O(S²). Five hundred
  opens then closes imply about 125,000 candidate visits per part. The benchmark
  explicitly removes unmatched markers; its results cannot rule this out.
  A fix must preserve same-voice, latest-onset, and chord ordering semantics.
- `Spanner.membersOf` copies/filters a span and continuation lookup scans backward
  (`spanner.ts:266`, `:306`). Asking every member of a length-S span for all members
  inherently produces O(S²) output; distinguish this from avoidable lookup work.
- `groupBeamRuns` is one pass over notes plus passes over the disjoint runs
  (`beam.ts:32`); beam-level scans are bounded in ordinary notation. `onsetsIn`
  is linear and `onsetOf` caches it (`timeline.ts:13`). Recomputing the public
  full map per note would be caller-induced quadratic work.
- `Measure.voices` scans voice IDs and notes (`measure.ts:336`), giving O(L V).
  Part metadata lookup scans score-part entries (`part.ts:401`), O(P²) when all
  parts are queried. These dimensions are normally small; do not infer that
  every `.find` in a loop deserves a fix task.
- `Part.staveCount` and `partSymbol` can scan all measures (`part.ts:352`, `:369`);
  repeated caller queries can be quadratic when declarations are absent. The
  measured read walk uses `Measure.staveCount`, which uses the carry cache.
  Adding instruments also scans document IDs (`part.ts:206`, `:458`), O(k N)
  for k additions to an N-node score; instrument count is ordinarily small.
- `attributesBackFrom` materializes all preceding attributes for signature copy
  (`signature.ts:15`, `measure.ts:944`); repeatedly inserting measures and copying
  signatures is not a read-only lookup. `Voice.addNote` scans its current measure
  for the voice end and cursor (`voice.ts:85`, `:148`, `timeline.ts:86`). Growing
  one dense measure through single-note calls is quadratic even with fast append.
- MusicXML serialization uses maps and joins (`music-xml-serializer.ts:32`),
  rather than repeated growing-string concatenation in a loop. With ordinary
  bounded MusicXML depth its traversal/output is linear. `xml.ts` is only a type.
  GP serialization delegates XML output to this serializer; its table construction
  is the relevant risk. GPX `readString` uses `+=` for bounded filename fields,
  not growing score output (`guitar-pro-gpx-file-system.ts:214`).

## Fix tasks and guards

Lane 5 fixes are ranked by impact, with links for shared files and prerequisites:

1. #45 `scoped-read-caches`: editor latency grows with score size after every
   edit; scope invalidation and preserve unrelated source reads during export.
2. #66 `indexed-gp-events`: eliminate the dominant GP direction rescans and
   repeated bar/tempo table searches.
3. #46 `bulk-tree-construction`: remove wide sibling-array copies during XML
   import and GPIF construction; the GP import profile directly supports this.
4. #47 `indexed-score-walks`: index positions, signatures and cursor stops;
   dense cursor slowdown is measured, boundary copying is statically established.
5. #49 `indexed-spanner-numbers`: eliminate full-part scans per span allocation,
   preserving the newer overlap-aware number reuse. Static evidence only; the
   default GP seed contains no ties.

All five depend on #42's final evidence. #46 follows #66 because both change the
GP writer; #49 follows #45/#47's mutation and note-index work. Existing GP work
is linked where it shares files. No library fixes were made in this audit.
Structural history and the low-impact/pathological cases above remain notes.

#43 has the measurements and caveats for the regression guard. At bounded
measure density, MXL unzip, XML/MXL serialization, read-walk and pitch history
support active time guards. Keep TODO guards linked to the fixes for parsing,
GP, edit/read and cursor/density workloads. Do not generalize a passing
measure-axis guard to density, parts, spanners or structural history. Validate
heap accounting before using generic document/GP heap ratios; fixed-count
pitch-history retention is the strongest supported memory guard here.
