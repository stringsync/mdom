# LilyPond unofficial MusicXML test suite

Vendored from https://github.com/lilypond/lilypond/tree/f04618b33e5d0e233a2ba9987de4f861ba2cdcdb/input/regression/musicxml
at revision `f04618b33e5d0e233a2ba9987de4f861ba2cdcdb`. All 166 XML/MXL fixtures in that directory are included unchanged;
LilyPond rendering expectations and documentation are not needed here.

Copyright (c) 2008--2026 Reinhold Kainhofer. The suite is MIT licensed;
see the unmodified LICENSE alongside these files. This license applies to this
suite, independently of LilyPond's program license.

Tests live in `packages/e2e/lilypond-suite.test.ts`. Known failures are tracked
there per invariant, so passing invariants continue to run for affected files.

Known failure: `45i-Repeats-Nested.xml` places `<repeat>` before `<ending>`
in measure 5. The serializer preserves this invalid input order. Only its XSD
check is marked `it.failing` (follow-up task #23); parsing, score content, and
round-trip stability still pass. An unexpected fix makes the failing test fail
until the marker is removed.
