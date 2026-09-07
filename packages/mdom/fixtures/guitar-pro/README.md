# Guitar Pro fixtures

These unmodified Guitar Pro 7 fixtures come from alphaTab's test corpus:
https://github.com/CoderLine/alphaTab/tree/1f428ccd1ea2faeeb1a8b48cb17194cfd60ba11e/packages/alphatab/test-data/guitarpro7

Upstream commit: `1f428ccd1ea2faeeb1a8b48cb17194cfd60ba11e`. Copyright Daniel Kuschny and contributors.
The upstream MPL-2.0 license is included as `LICENSE.alphatab`.

The files are committed so `mdom test` runs offline. They exercise the reader
independently of mdom's writer. Export tests inspect the generated GPIF XML,
and round-trip tests cover the musical values across both conversions.

`hide-tuning.gp` comes from the same commit's
`packages/alphatab/test-data/guitarpro8` directory and covers a GP8 empty bar.

`piano-playback.gpif` contains only the first track's AudioEngineState, Sounds,
and Automations nodes from alphaTab's
`packages/alphatab/test-data/guitarpro8/header-footer.gp` at the same pinned
commit above. It provides an independent native GP8 piano playback reference;
no score content is included. The accompanying alphaTab license also applies.
