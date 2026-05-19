# mdom

A mutable DOM for MusicXML: parse a MusicXML string into a queryable,
editable document, then serialize back to MusicXML.

mdom normalizes both MusicXML flavors (`score-partwise` and
`score-timewise`) into a single **timewise** hierarchy so callers never
branch on input format.

## mdom.api

The only entry point is `parse`. It returns a `Document`, or throws an
`MdomError` (see `mdom.errors`) on failure.

```ts
const document = mdom.parse('some MusicXML string'); // Document, or throws MdomError
```

There is intentionally no result-object variant. Throwing is the contract;
callers handle failure with `try`/`catch` and narrow by `error.kind`.

## mdom.errors

All errors extend `MdomError`. The taxonomy, narrowing by `error.kind`:

- `XmlParseError` — input is not well-formed XML.
- `InvalidMusicXmlError` — well-formed XML but not valid MusicXML.
- `UnsupportedFeatureError` — valid MusicXML mdom does not yet model.
- `TodoError` — unimplemented code path, interim only.

Errors are constructed directly (`new XmlParseError(message)`). `parse` only
ever throws the first three; `TodoError` surfaces from unfinished internals
during development.

## mdom.hierarchy

The normalized tree. Each parent _has many_ of its child:

- `Document` → `Measure`
- `Measure` → `Part`
- `Part` → `Stave`
- `Stave` → `Voice`
- `Voice` → `Entry`
- `Entry` → `Mod`

A `Measure` is a timewise slice across all parts. A `Stave` is a staff line
within a part (e.g. piano has two). A `Voice` is an independent rhythmic
stream within a stave. An `Entry` is the atomic timed unit in a voice (see
`mdom.entries`). A `Mod` modifies an entry (see `mdom.mods`).

## mdom.navigation

Navigation is graph-first. Every node carries back-references, so traversal
is bidirectional and possible from any node:

```ts
measure.parent(); // Document
note.parent(); // up the chain: Voice → Stave → Part → Measure → Document
node.document(); // root, reachable from anywhere
node.key(); // this node's address (see below)
```

Downward traversal mirrors the hierarchy, and accessors carry no `get`
prefix — the node-level child accessor matches the `mdom.keys` collection
accessor of the same name:

```ts
measure.parts(); // Part[]
voice.entries(); // Entry[]
```

`node.key()` is unambiguously the node's address; the musical key signature
is `measure.keySignature()` (see `mdom.timing`).

## mdom.keys

Keys are stable, serializable addresses for navigation and querying. Each key extends the one above it,
so a deeper key is a superset of its ancestors:

```ts
type MeasureKey = { measureIndex: number };
type PartKey = MeasureKey & { partIndex: number };
type StaveKey = PartKey & { staveIndex: number };
type VoiceKey = StaveKey & { voiceIndex: number };
type EntryKey = VoiceKey & { entryIndex: number };
type ModKey = EntryKey & { modIndex: number };
```

Resolution goes through a single overloaded `at` on `Document`, not a matrix
of per-level getters:

```ts
doc.at(measureKey); // Measure | undefined
doc.at(modKey); // Mod | undefined
doc.measures(); // Measure[]   (collection accessors per level)
```

Keys survive serialization, making them suitable for cursors, selections,
annotations, and diffs against a re-parsed document.

## mdom.query

Querying uses a chainable, typed `NodeList<T>` rather than string selectors —
the domain is structured, so types beat stringly-typed selectors.

Each level exposes a collection; flatteners descend the hierarchy:

```ts
doc
  .measures()
  .slice(4, 8)
  .parts()
  .named('Violin I')
  .voices()
  .notes() // descends to notes, drops rests/chords-as-units
  .where((n) => n.pitch.midi >= 60)
  .at(beat(2.5)); // entries sounding at that musical time
```

`NodeList<T>` provides `map`, `filter`, `where`, `first`, `slice`, `at(time)`,
the hierarchy flatteners (`measures`, `parts`, `staves`, `voices`, `entries`,
`notes`, `mods`), and `named(string)` where a node has a name.

Convenience shortcuts for the common cases:

```ts
doc.notesAt({ measure: 3, beat: 1 }); // NodeList<Note>
doc.mods.ofType(Slur); // every Slur in the document
```

## mdom.timing

Timing is **resolved** and **derived**, never raw and never stored.

MusicXML expresses duration in per-context `<divisions>` ticks with
`<backup>`/`<forward>` cursor moves. mdom hides all of that. Every `Entry`
exposes timing in quarter notes, independent of divisions:

```ts
entry.start; // quarter notes from the start of its measure
entry.absStart; // quarter notes from the start of the score
entry.duration; // quarter notes
entry.tuplet; // { actual: number; normal: number } | undefined
```

Because mdom is mutable (`mdom.mutation`), timing is **derived on read**, not
stored. Changing an entry's duration shifts every following entry's `start`
automatically; there is no separate timing-sync step. Serialization
re-derives `<divisions>`, `<backup>`, and `<forward>` from resolved timing —
this is the round-trip contract.

Resolved timing is in quarter notes only; the measure-level musical context
that gives those quarter notes meaning (time signature, tempo, etc.) lives on
the relevant node — see `mdom.context`.

## mdom.context

Musical context — the meter, key, tempo, and clef a passage is read in —
lives on the node whose span it applies to, not on every `Entry`. It is the
counterpart to `mdom.timing`: timing says _when_ in quarter notes, context
says _how those quarter notes are read_.

```ts
measure.time(); // { beats: number; beatType: number }
measure.keySignature(); // { fifths: number; mode: "major" | "minor" | ... }
measure.tempo(); // quarter notes per minute | undefined
stave.clef(); // { sign: "G" | "F" | "C"; line: number }
```

Context is resolved, not raw: a value set in an earlier measure stays in
effect until changed, so each accessor returns the value in force at that
node rather than only what that measure's MusicXML restated. `tempo()`
returns `undefined` when no tempo has been established.

## mdom.entries

An `Entry` is the atomic timed unit within a voice. Its `kind` discriminates:

```ts
entry.kind; // "note" | "rest" | "chord"
entry.notes; // Note[]: 1 for a note, N for a chord, 0 for a rest
entry.duration; // quarter notes (see mdom.timing)
entry.mods; // ModList (see mdom.mods)
```

A chord is **one** `Entry` with multiple `Note`s — MusicXML's per-note
`<chord/>` flag is a serialization detail mdom hides. A rest is an `Entry`
with no notes.

```ts
note.pitch; // { step, octave, alter, midi, name }  e.g. name === "C#4"
```

## mdom.mods

`Mod` is the base class for everything that modifies a fundamental note:
articulations, ornaments, beams, ties, slurs, dynamics, lyrics, and more.
Mods are real classes (containment + behavior), with a typed collection for
ergonomic querying.

```ts
abstract class Mod {
  kind: string; // discriminant, also reflected by the subclass
  entries(): Entry[]; // host entries (see spanning below)
}

class Slur extends Mod {}
class Tie extends Mod {}
class Beam extends Mod {}
class Articulation extends Mod {}
class Ornament extends Mod {}
class Dynamic extends Mod {}
class Lyric extends Mod {}
// ...extended as coverage grows
```

`ModList` bridges classes to querying with constructor-based narrowing, so
callers never cast:

```ts
entry.mods.ofType(Slur); // Slur[]
entry.mods.first(Tie); // Tie | undefined
entry.mods.has(Beam); // boolean
```

`instanceof` still works for ad-hoc checks; `ofType(Ctor)` is the path for
queries.

## mdom.spans

Spanning relationships (slurs, ties, beams, wedges) are a **single** `Mod`
object referenced by every entry it covers — not duplicated endpoints.
`mod.entries()` returns all hosts: length 1 for a point mod such as an
articulation, length N for a span. A span is discoverable both from a host
entry (`entry.mods`) and from the whole document (`doc.mods.ofType(Slur)`).

## mdom.mutation

mdom is mutable; making MusicXML easy to render _and_ edit is the point.
Nodes carry parent back-references, so structural edits keep the graph
consistent. Derived timing (`mdom.timing`) recomputes on read after any edit.

Representative surface (to be detailed as it's built):

```ts
voice.insert(index, entry);
voice.remove(entry);
entry.setDuration(quarterNotes);
note.setPitch({ step: 'D', octave: 4, alter: 1 });
entry.mods.add(new Slur(/* ... */));
entry.mods.remove(slur);
```

Editing durations or structure never requires a manual timing-sync pass; it
falls out of `mdom.timing` being derived.

## mdom.serialization

`document.toMusicXML(): string` round-trips back to MusicXML. mdom emits
`score-partwise` regardless of the parsed flavor, re-deriving `<divisions>`,
`<backup>`, and `<forward>` from resolved timing. Round-trip preserves
musical content; it does not promise byte-identical XML.

## mdom.cli

mdom ships a command-line interface invoked as `mdom`. It is registered as a
`bin` in `package.json` (`{ "mdom": "cli/index.ts" }`), so `bun link` makes
`mdom` callable from the shell and `bun unlink` removes it. All CLI code lives
under `cli/`; `cli/index.ts` is the entry point and carries a `#!/usr/bin/env
bun` shebang. The CLI is built on `commander` and is a developer tool, not part
of `mdom.api`.

```
mdom fix [--check]    # format, lint, and typecheck
mdom test [args...]   # run the test suite
mdom release <type>   # bump the package version
mdom scan [args...]   # scan the project specs
mdom show [args...]   # show a project spec
```

Commands:

- `fix` — formats, lints, and typechecks the project, reporting each step's
  pass/fail and throwing if any step fails. `--check` checks without writing
  fixes (CI mode); without it, formatter and linter apply fixes in place.
- `test` — runs the project's test suite via `bun test`, forwarding `bun
test`'s exit code as the process exit code so it composes in CI. Any extra
  arguments (including unknown options like `--watch` or a test name filter)
  are passed through verbatim to the underlying `bun test`.
- `release` — declared with `.argument('<type>', 'version bump (patch, minor,
major)')`. It bumps the `version` field in `package.json` by the requested
  semver level. An unrecognized `<type>` is rejected with a nonzero exit.
- `scan` / `show` — thin pass-throughs to the `@stringsync/spec` CLI, run via
  `bunx -y @stringsync/spec <subcommand>`. Both `allowUnknownOption()` and
  forward all extra arguments verbatim, propagating the child's exit code so
  they compose in CI. `scan` gives a spec overview; `show <module>.<name>`
  inspects one spec. These let `mdom` be the single entry point for auditing
  the implementation against the spec — no MCP server required.

Command actions are composed from shared wrappers in `cli/util.ts`:
`withErrorHandling` turns a thrown error into a red message and a nonzero
exit; `withTiming` prints elapsed time on completion. Every command exits
nonzero on failure so the CLI is scriptable.
