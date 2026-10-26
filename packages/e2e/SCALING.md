# Scaling benchmark

Run from the repository root with Bun. Fixtures ship in the repository; nothing
under `/tmp` or a downloaded corpus is required. The former
`read-lookups.bench.ts` entry point forwards to this command with the same options.

```sh
# Small development smoke case; single operation + size runs in this process.
bun packages/e2e/scaling.bench.ts --operation read-walk --size 1 --samples 1

# Full audit: 100, 200, 400, 800 measures, thirteen operations, three samples each.
# This is heavy: obtain the splates run-command permission before running it.
bun packages/e2e/scaling.bench.ts --json scaling.json

# Select an orchestral seed, or extend the series to 1600 measures.
bun packages/e2e/scaling.bench.ts --seed packages/e2e/examples/actor_prelude_sample.xml --steps 5 --json orchestra.json

# Independent axes; size replaces the selected axis, the other dimensions stay fixed.
bun packages/e2e/scaling.bench.ts --axis parts --base 1 --steps 4 --measures 100 --voices 1 --notes 4 --json parts.json
bun packages/e2e/scaling.bench.ts --axis voices --base 1 --steps 3 --measures 100 --parts 1 --notes 4 --json voices.json
bun packages/e2e/scaling.bench.ts --axis notes --base 4 --steps 4 --measures 100 --json density.json

# Separate score-size growth from edit-count growth by holding k fixed.
bun packages/e2e/scaling.bench.ts --operation edit-set-read --edits 100 --json edits.json

# Target one operation/size with Bun's profilers. Setup is also in the profile;
# inspect measureOperation/readWalk/cursorWalk for the operation itself.
bun --cpu-prof packages/e2e/scaling.bench.ts --operation cursor --size 100 --samples 1
bun --heap-prof packages/e2e/scaling.bench.ts --operation history --size 100 --samples 1

# Generated command help (including option defaults).
bun packages/e2e/scaling.bench.ts run --help
```

## Score construction

The measure axis repeats the complete measures of a real XML seed, defaulting to
`examples/lilypond/21d-Chords-SchubertStabatMater.xml`. It preserves all seed parts,
renumbers measures, gives part/instrument IDs unique suffixes, and strips copied
node IDs. Each seed cycle starts from its original attribute declarations. Each
complete or truncated cycle keeps complete slurs, ties and wedges and drops
unmatched endpoints and continuation markers. Other numbered start/stop spans
(octave shifts, pedals, dashes, brackets, wavy lines and tuplets) use the same
boundary cleanup. Header layout/credits are omitted; score-part metadata remains.

The parts, voices and notes axes use controlled synthetic MusicXML, taking a
pitch from the real seed. `--synthetic` also enables this for the measure axis.
There are `--notes` quarter notes **per voice per measure**, simultaneous voices
separated by backups, a matching time signature, paired ties/slurs/wedges, and
clef/key/time/transpose/divisions declared only at the start. `--size` replaces
the selected axis. `--parts`, `--voices`, `--notes` and `--measures` configure the
other synthetic dimensions; they do not reshape the real-measure mode.

`gp-parse`, `gpif-parse` and `serialize-gp` instead start from the real
`packages/mdom/fixtures/guitar-pro/notes.gp` fixture (`--gp-seed` overrides it).
The imported score is repeated through MusicXML with the same generator, then
re-exported outside the timer for GP import. GP export explicitly omits unsupported
annotations; core-data restrictions still fail (for example, over four voices per
staff). Errors appear in the table and JSON, other cases continue, and the final
exit status is nonzero. Compare growth **within** each operation: GP cases have
different musical content from XML cases. JSON records actual counts for every case.

## Operations and measurements

- `parse`: MDOMParser over generated XML.
- `mxl-unzip`: ArchiveReader load and decompression of score.musicxml, excluding
  XML parsing. Archive construction is outside the timer.
- `gp-parse`: GuitarProParser over the generated GP archive, including unzip.
- `gpif-parse`: MDOMParser over the archive's score.gpif, excluding unzip and
  reading the GPIF into a score: the wide GPIF tables alone.
- `serialize-xml`, `serialize-mxl`, `serialize-gp`: complete serializer calls,
  including compression where applicable.
- `read-walk`: every note's measureBeat/beats/divisions and slur/tie partner;
  each measure's timeline onsets and carry-forward clef/key/time/transpose by staff.
- `cursor`: discover voices and walk Cursor.next from each voice's first onset
  to its last onset, across every part. The checksum counts visited onsets.
- `edit-insert-read`, `edit-remove-read`, `edit-set-read`: addNote, Note.remove,
  or setPitch, followed by one getKey read at the far end of that same part.
  Default k is the initial total note count; `--edits` holds it fixed. Removals
  cap k at the available notes. Raw samples record the actual `workUnits`.
- `span-add`: a slur, tuplet and tie from each note to the next in its part,
  each numbered against the spans already added. `workUnits` counts the spans.
- `history`: k individual named pitch edits, undo all, redo all. Raw samples
  include separate edit/undo/redo timings and actual history entry counts.

Input generation, file I/O, input compression, document preparation and explicit
GC are outside operation timings. Input preparation primes parser code and some
structural caches; the read walk starts without priming its signature/spanner
lookups. There is no adaptive warmup or duration calibration. Multiple-case runs
start a fresh process **for each sample**, sequentially. Single-operation,
single-size runs stay in the invoking process so profilers attach to the work;
multiple samples there share runtime/JIT state but get fresh documents.

Each heap reading follows `Bun.gc(true)`. Raw samples record absolute before/after
`process.memoryUsage().heapUsed`, signed operation heap delta, and document heap
relative to a pre-parse baseline. Outputs and the input document remain live
through the after reading. These are retained JS heap measurements, **not peak
allocation, external buffer size, or RSS**; negative deltas and small noisy values
are kept as measured. History additionally records heap after edit/undo/redo and
after dispose, growth per edit, and retained bytes per entry calculated as
(after redo minus after dispose) / actual entries, comparing the same final tree.
These differences still include runtime/GC noise.

## Report format

The tab-separated table shows median elapsed time, operation heap delta, document
heap, history bytes per entry, and adjacent doubling ratios. Ratios over 3 in time
or either heap metric are flagged. Exact doublings only are compared; nonpositive
heap deltas have no ratio. A flag is an audit lead, not proof of complexity: compare
several sizes, raw samples and work units, particularly when k also doubles.

`--json path` writes schema version 1, Bun/platform information, effective options,
isolation mode, raw per-case counts/samples/errors and the same median summary.
History phase timings and memory readings live in `results[].samples[]`. This is
the input for the separate performance audit; this tool changes no library behavior.
