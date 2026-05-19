# testkit

Test-only infrastructure for exercising `mdom`. Nothing here ships in the
public API (`index.ts` does not re-export it); it exists so tests can
describe music instead of hand-writing MusicXML strings.

## testkit.musicxml

A lightweight MusicXML builder. The deliberate non-goal is being a complete
MusicXML model (that is what `@stringsync/musicxml` is for, and it is too
heavy-handed for fixtures). The goal is: describe the music a test cares
about in a few lines, and emit valid MusicXML for `mdom.parse`.

`score` is the only entry point. It takes a builder callback and returns a
MusicXML string:

```ts
const xml = score((s) => {
  s.part('Violin I', (p) => {
    p.measure({ time: [3, 4], key: 2, clef: ['G', 2], tempo: 120 }, (m) => {
      m.note('C4');
      m.note('E4', 1, (n) => n.staccato().slur('start'));
      m.note('G4', 1, (n) => n.slur('stop'));
    });
  });
});
```

Nesting is expressed with closures, not chained `.end()` calls — scope is
unambiguous and arbitrary depth (part → measure → note → mods) reads the
way the hierarchy nests.

## testkit.durations

Tests think in quarter notes (matching `mdom.timing`), never in
`<divisions>` ticks. A duration argument is quarter notes (default `1`); the
exported `durations` namespace names them — `durations.eighth` is `0.5`,
with parallel `durations.dotted` and `durations.triplet` namespaces so
`durations.triplet.eighth` is `1/3` and `durations.dotted.half` is `3` — so
call sites read as music and the 3:2 / dotted intent isn't hidden behind a
bare number. Raw numbers still work. The builder derives the minimal
integer `<divisions>` for the whole part so every duration lands on a tick,
and emits `<backup>`/`<forward>` for multi-voice writing. `score`-level
`divisions(n)` forces a specific value when a test asserts on it.

## testkit.pitch

A pitch is a scientific-notation string (`'C4'`, `'C#4'`, `'Bb3'`,
`'F##5'`) or `{ step, octave, alter }`. A chord is one call with several
pitches; a rest takes no pitch.

```ts
m.note('C#4', 0.5);
m.chord(['C4', 'E4', 'G4'], 2);
m.rest(1);
```

## testkit.mods

The optional last argument to `note`/`rest`/`chord` is a callback over a
chainable mod configurator covering the `mdom.mods` surface — ties, slurs,
beams, tuplets, articulations, ornaments, dynamics, lyrics — plus
`voice`/`staff` placement and `type`/`dot` overrides. Spanning mods
(`slur`, `tie`, `beam`) emit their MusicXML start/stop endpoints on the
hosting notes; reconstructing the span is `mdom`'s job, not the builder's.

## testkit.escapes

The builder models only what fixtures commonly need. For anything else —
exotic elements, deliberately invalid or unsupported MusicXML, both score
flavors — there is always a raw escape:

- `score(...).` builder exposes `timewise()` to emit `score-timewise`
  instead of the default `score-partwise`, so both `mdom.parse`
  normalization paths are testable from one description.
- `raw(xml)` exists at score, measure, and note scope to inject verbatim
  XML, so a test never has to extend the builder to cover a one-off case.
  </content>
