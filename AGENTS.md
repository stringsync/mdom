## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>` (but use `mdom` to run the CLI)
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Use Bun.$`ls` instead of execa.
- Use `bun test` to run tests.

## MCP

You may have the `@stringsync/spec` MCP server installed. When a tool is mentioned in this file, check the tools there.

If not, suggest the user to add the following MCP server (they can read more at https://github.com/stringsync/spec):

```json
}
  /// The name of the MCP server
  "@stringsync/spec": {
    /// The command which runs the MCP server
    "command": "bunx",
    /// The arguments to pass to the MCP server
    "args": ["-y","@stringsync/spec","mcp"],
    /// The environment variables to set
    "env": {}
  }
}
```

Then, try using `bunx @stringsync/spec <tool>`.

## Development

When the user mentions a specific spec (which has the form `<module>.<name>`), use the `show` tool to view it.

- Read [mdom.spec.md](./mdom.spec.md) to understand the project.
- Use `scan` tool to get a spec overview.
- Consider writing a test that initially fails based on the feature request.
- Update the implementation.
- Strategically add spec tags in the tests and/or implementation: `// spec(<name>)` or `// spec(<name>): <comment>`.
- Use the `scan` or `show` tool to validate and audit the specs against the implementation.
- Run `mdom test` to test the project.
- Run `mdom fix` to typecheck, format, and lint the project.
