# mdom

A DOM for MusicXML. Parse a score into a typed, queryable tree, edit it in
musical terms, and serialize it back. Unknown tags round-trip verbatim.

```sh
bun add @stringsync/mdom
```

See [packages/mdom](./packages/mdom) for what the library does and how to use
it. This file covers the repository around it.

## Packages

A bun workspace. `packages/mdom` is `@stringsync/mdom`, the published library,
and everything else exists to build or check it.

| Package         | What it is                                                  |
| --------------- | ----------------------------------------------------------- |
| `packages/mdom` | the library. Source sits flat in `packages/mdom`             |
| `packages/cli`  | the `mdom` CLI below                                         |
| `packages/e2e`  | end-to-end tests and the cross-exporter MusicXML corpus      |

## Development

```sh
profile=~/.${SHELL##*/}rc # ~/.zshrc, ~/.bashrc, etc.
echo "export PATH=\"$PWD/bin:\$PATH\"" >> "$profile"
source "$profile"

mdom test   # run the test suite
mdom fix    # typecheck, format, lint
```

`mdom test` needs `xmllint` on PATH: the writer tests validate their output
against the vendored [MusicXML XSD](./packages/mdom/schema).

## Releasing

```sh
mdom release patch  # or minor, major
```

`webappwiz/ship` owns the flow. It builds every public package into a `dist/`
of JavaScript and declarations, stamps one version across the workspace,
commits, publishes to npm, tags, and writes the GitHub release notes. Nothing
here publishes source, so a consumer needs no compiler.
