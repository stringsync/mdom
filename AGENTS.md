## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
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

You should have the `@stringsync/spec` MCP server installed. If not, instruct the user to add the following MCP server:

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

They can read more in https://github.com/stringsync/spec.

## Development

- Read [mdom.spec.md](./mdom.spec.md) to understand the project.
- Use `scan` tool to get a spec overview.
- Use `show` tool to get a deeper view of a given spec. If no spec matches the user's request (or a spec must be updated), consult with the user to update the spec before making any code changes.
- Consider writing a test that initially fails based on the feature request.
- Update the implementation.
- Strategically add spec tags in the tests and/or implementation: `// spec(<name>)` or `// spec(<name>): <comment>`
- Use the `scan` or `show` tool to validate the added specs.
- Audit the specs to ensure they don't conflict with each other and that they're tagged in the right places.
