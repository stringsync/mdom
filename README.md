# mdom

A DOM for MusicXML.

## CLI

mdom ships a `mdom` command-line tool. To make it callable from your shell:

```sh
bun link
```

To remove it:

```sh
bun unlink
```

Once linked:

```sh
mdom fix [options]    # format, lint, and typecheck
mdom test [args...]   # run the test suite
mdom release <type>   # bump the package version (patch, minor, major)
mdom scan [args...]   # scan the project specs
mdom show [args...]   # show a project spec
```

To see how the project is implemented, run:

```sh
mdom scan
```
