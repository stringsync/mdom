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

## Converting scores

Use `convert` to change the file format. Transposition means changing musical
pitch; this command keeps the music in its original key.

```sh
mdom convert --input song.gp --output song.musicxml
mdom convert --input song.musicxml --output song.mxl
mdom convert --input song.mxl --output converted.gp
```

Extensions select the input and output formats: `.musicxml` or `.xml` for
UTF-8 MusicXML, `.mxl` for compressed MusicXML, and `.gp` for Guitar Pro 7/8.
Relative paths resolve from the directory where you ran the command. The
output directory must already exist.

Existing output files are protected unless you pass `--force`. Input and
output must be different paths. Parsing and conversion finish before the
output is written, so a conversion error leaves an existing output untouched.

Guitar Pro uses the library's [supported subset](./packages/mdom/README.md).
Unsupported annotations fail by default; pass `--omit-unsupported` to explicitly
discard them. Invalid core notation still fails. Run `mdom convert --help` for
the command options.

The command program is exported from [packages/cli/mdom.ts](./packages/cli/mdom.ts).
[packages/cli/index.ts](./packages/cli/index.ts) only creates real dependencies,
remembers the invocation directory, changes to the repository root for
development commands, and runs the program. Command tests supply filesystem,
process and logging fakes; entrypoint tests also exercise real files and child
processes. Run them with `mdom test packages/cli`.

## Shipping

```sh
mdom ship patch  # or minor, major
```

`webappwiz/ship` owns the flow. It builds every public package into a `dist/`
of JavaScript and declarations, stamps one version across the workspace,
commits, publishes to npm, tags, and writes the GitHub release notes. Nothing
here publishes source, so a consumer needs no compiler.
