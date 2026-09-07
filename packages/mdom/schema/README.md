# MusicXML 4.0 XSD

Vendored verbatim from [w3c/musicxml@v4.0](https://github.com/w3c/musicxml/tree/v4.0/schema),
except that `musicxml.xsd`'s two `schemaLocation`s point at the sibling files
here instead of `http://www.musicxml.org/xsd/`, so validation needs no network.

Test-only — a release publishes the built `dist/` alone, and nothing here
reaches it. `music-xml-schema.ts` runs it through `xmllint`; the writer tests
(`score-writer.test.ts`, `attributes-writer.test.ts`, `notation-writer.test.ts`)
are what call it.
