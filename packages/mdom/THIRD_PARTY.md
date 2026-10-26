# Third-party source and fixtures

The following files adapt the Guitar Pro format handling in alphaTab 1.8.4
by Daniel Kuschny and Contributors and are distributed under MPL-2.0:

- `guitar-pro-document-reader.ts`: GPIF table references, rhythms, pitches,
  articulations, tempo, staff and measure fields, based on `src/importer/GpifParser.ts`.
- `guitar-pro-score-writer.ts`: GPIF table and field encoding, based on
  `src/exporter/GpifWriter.ts`.
- `guitar-pro-playback.ts`: instrument and sound field structure, based on
  `src/exporter/GpifWriter.ts` and the MIDI instrument mapping from
  `src/exporter/GpifSoundMapper.ts`; built-in soundbank assignments are retained from mdom.
- `guitar-pro-gpx-file-system.ts`: BCFZ decompression and BCFS file-system reading,
  based on `src/importer/GpxFileSystem.ts` and `src/io/BitReader.ts`.
- `guitar-pro-binary-reader.ts`: Guitar Pro 5 record layout (score header, master bars,
  tracks, beats, notes and effect fields), based on `src/importer/Gp3To5Importer.ts`.
- `guitar-pro-drum-kit.ts`: Guitar Pro's standard drum kit articulations and the GP6
  element/variation table, based on `src/model/PercussionMapper.ts` and the kit stored in
  alphaTab's `test-data/guitarpro7/drum-tabs.gp`.
- `guitar-pro-configuration.ts`: binary score views and track flags, based on
  `src/importer/PartConfiguration.ts` and `src/importer/LayoutConfiguration.ts`.

Upstream: <https://github.com/CoderLine/alphaTab/tree/v1.8.4>

Copyright © 2025, Daniel Kuschny and Contributors, All rights reserved.
The full license is included in [LICENSE.MPL-2.0](./LICENSE.MPL-2.0).
These files are shipped as TypeScript source. Their modifications replace the
alphaTab score model and IO layer with mdom nodes, validated GPIF references,
and standard byte arrays. No alphaTab package or bundled runtime is included.

Other mdom source remains under the repository's MIT license.
The package's `MIT AND MPL-2.0` metadata reflects these file-specific licenses.
Fixture provenance and notices are retained in
[fixtures/guitar-pro/README.md](./fixtures/guitar-pro/README.md).
