A bun workspace. `packages/mdom` is `@stringsync/mdom`, the published library,
and everything else exists to build or check it:

| Package         | What it is                                                  |
| --------------- | ----------------------------------------------------------- |
| `packages/mdom` | the library. Source sits flat in `packages/mdom`             |
| `packages/cli`  | the `mdom` CLI below                                         |
| `packages/e2e`  | end-to-end tests and the cross-exporter MusicXML corpus      |

Make code changes with arbor by default: follow the `arbor` skill
(`.claude/skills/arbor`) to work in an isolated worktree and land on `master`
with `arbor merge`, unless told otherwise.

After making code changes:

- Run `mdom test` to test the project.
- Run `mdom fix` to typecheck, format, and lint the project.
