# mdom

A DOM for MusicXML: a faithful, mutable tree of the document that round-trips
losslessly, with typed nodes for ergonomic querying.

## Design direction

- **Faithful tree, not a model.** Every MusicXML element becomes an `MElement`
  (tag + attributes + children) in `m-node.ts`. We mirror the markup; we do not
  re-imagine it. Anything we haven't typed stays a plain `MElement` and still
  round-trips.
- **Typed nodes extend `MElement`.** `Score` / `Part` / `Measure` add typed,
  downward query getters (`score.parts`, `part.measures`). The parser picks the
  subclass per tag from the registry in `xml.ts`; unknown tags fall back to
  `MElement`. Add a typed node only when you need ergonomic access to it — do
  not model the whole spec up front.
- **Part-major, because partwise MusicXML is.** The tree mirrors
  `score-partwise → part → measure`. There is no spine decision to make.
- **Mutation is via methods only.** `children` is a read-only view; mutate with
  `append` / `remove`. There is exactly one way to change the tree.
- **Upward queries are derived, never stored.** Nodes carry a generic `parent`
  (set mechanically by the mutation methods); no class stores a typed parent.
  Climb with `closest(Type)`. Non-tree relationships (slurs, ties, beams —
  paired start/stop markers joined by a `number` attribute) are resolved by
  query methods on the typed node, not by tree structure.
- **Fidelity is the contract.** Parse then serialize must be idempotent at the
  serialized level — see `src/round-trip.test.ts`. Whitespace-only text and
  comments are dropped on parse so this holds; significant text is preserved.
  Do not add a feature that breaks that test.

Parse/serialize live in `xml.ts` (`MDOMParser` / `MXMLSerializer`, built on the
`xml-js` dependency); nodes stay pure data + queries.

## Commands

After making changes:

- Run `mdom test` to test the project.
- Run `mdom fix` to typecheck, format, and lint the project.
