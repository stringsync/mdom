# MusicXML 4.0 XSD

Vendored verbatim from [w3c/musicxml@v4.0](https://github.com/w3c/musicxml/tree/v4.0/schema),
except that `musicxml.xsd`'s two `schemaLocation`s point at the sibling files
here instead of `http://www.musicxml.org/xsd/`, so validation needs no network.

Test-only — `package.json` publishes `dist/` alone. `src/music-xml-schema.ts`
runs it through `xmllint`; see `src/writer-schema.test.ts`.
