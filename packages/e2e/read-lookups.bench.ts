// Kept as an entry point for existing callers. The reproducible scaling bench
// includes read-walk plus parsing, serialization, cursors, editing and history.
// bun packages/e2e/read-lookups.bench.ts --operation read-walk --size 100
import './scaling.bench';
