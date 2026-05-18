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
mdom fix [--check]    # format, lint, and typecheck
mdom test             # run the test suite
mdom release <type>   # bump the package version (patch, minor, major)
```
