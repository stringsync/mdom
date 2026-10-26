# Modern exporter fixtures

The Sibelius and Dorico files are unmodified copies from OpenSheetMusicDisplay commit
`0e55fe60a26b6d0fc6f67b4aad8013580637e281`. They are distributed under its
BSD-3-Clause license, retained in `LICENSE.opensheetmusicdisplay` (Copyright
2019 PhonicScore). Exporter versions below come from the files' own
`identification/encoding/software` elements, rather than filenames.

| Local file | Original source | Encoding software | Coverage |
| --- | --- | --- | --- |
| `sibelius_2023_tab.musicxml` | [test_tabs_x-align_vertically.musicxml](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/0e55fe60a26b6d0fc6f67b4aad8013580637e281/test/data/test_tabs_x-align_vertically.musicxml) | Sibelius 2023.6; Dolet 8.3 for Sibelius | One bar, separate notation and six-string drop-D tablature parts |
| `dorico_4_notations.musicxml` | [test_notations_nodes_dorico_say_something.musicxml](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/0e55fe60a26b6d0fc6f67b4aad8013580637e281/test/data/test_notations_nodes_dorico_say_something.musicxml) | Dorico 4.2.0.1092 | Five bars, four vocal parts, lyrics, ties and slurs in separate notations blocks |

Both files pass parse/serialize idempotence. A fixpoint checks serialization
stability; the read assertions in `real-world-modern-exporters.test.ts` separately
check musical values and multiple notations blocks.

## User-supplied guitar score

`aloof_gp7.musicxml` is an unmodified copy of `~/Desktop/aloof.xml`, supplied
by Jared on 2026-10-26 with permission to use it for this compatibility corpus.
It is independent of the OpenSheetMusicDisplay files and license above.
Its encoding metadata says **Guitar Pro 7.5.5**, dated 2021-10-29. It has one
steel guitar part, sixteen measures, standard notation and tablature staves,
and hammer-on markers. It passes MusicXML idempotence and has read assertions.

`aloof_gp8.musicxml` is an unmodified copy of `~/Desktop/aloof-gp8.xml`.
Jared opened the original score in Guitar Pro 8 and exported it for this corpus
on 2026-10-26. Its metadata identifies **Guitar Pro 8.1.5**, dated 2026-10-26.
It retains sixteen bars and hammer-ons, and passes idempotence. Unlike the GP7
file, GP8 places the notation staff's tuning inside a `<?GP ... ?>` processing
instruction; the tab staff still has real `staff-tuning` elements. The read
test checks that staff 2's tuning is read and the instruction stays opaque.

## Guitar Pro conversion

Measured with the default strict `GuitarProSerializer.serializeToBlob` on
2026-10-26. This records the **first** rejection, not all unsupported features
or proof of lossless conversion. Task #7's scoreboard has not merged yet.

| File | First result |
| --- | --- |
| `sibelius_2023_tab.musicxml` | Rejects `<transpose>` |
| `dorico_4_notations.musicxml` | Rejects `<lyric>`; already covered by task #10 |
| `aloof_gp7.musicxml` | Rejects `<transpose>`; same first cause tracked by task #24 |
| `aloof_gp8.musicxml` | Rejects `<transpose>`; same first cause tracked by task #24 |

MuseScore 4, Flat.io and TuxGuitar exports are still
needed. No older or hand-built file is labeled as one of those dialects.
