// SPDX-License-Identifier: MPL-2.0
// GPIF instrument fields adapted from alphaTab’s GpifWriter. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import { GuitarProXml as X } from './guitar-pro-xml';
import type { MElement } from './m-node';

/** Writes native instrument definitions and built-in RSE sounds directly to GPIF. */
export class GuitarProPlayback {
	write(track: MElement, program: number, channel: number): void {
		const [name, type, icon] = instruments[program]!;
		const preset = presets[type]!;
		X.add(track, 'IconId', icon);
		const instrument = X.add(track, 'InstrumentSet');
		X.add(instrument, 'Name', name);
		X.add(instrument, 'Type', type);
		X.add(instrument, 'LineCount', 5);
		const element = X.add(X.add(instrument, 'Elements'), 'Element');
		X.add(element, 'Name', 'Pitched');
		X.add(element, 'Type', 'pitched');
		X.add(element, 'SoundbankName', '');
		const articulation = X.add(X.add(element, 'Articulations'), 'Articulation');
		for (const [tag, value] of Object.entries({
			Name: '',
			StaffLine: '0',
			Noteheads: 'noteheadBlack noteheadHalf noteheadWhole',
			TechniquePlacement: 'outside',
			TechniqueSymbol: '',
			InputMidiNumbers: '',
			OutputRSESound: '',
			OutputMidiNumber: '0',
		})) {
			X.add(articulation, tag, value);
		}
		const transpose = X.add(track, 'Transpose');
		X.add(transpose, 'Chromatic', 0);
		X.add(transpose, 'Octave', 0);
		const strip = X.add(X.add(track, 'RSE'), 'ChannelStrip', undefined, {
			version: 'E56',
		});
		X.add(
			strip,
			'Parameters',
			'0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 1 0.5 0.5 0.75 0.5 0.5 0.5',
		);
		X.add(track, 'ForcedSound', -1);
		const connection = X.add(track, 'MidiConnection');
		X.add(connection, 'Port', 0);
		X.add(connection, 'PrimaryChannel', channel);
		X.add(connection, 'SecondaryChannel', channel);
		X.add(connection, 'ForeOneChannelPerString', 'false');
		X.add(track, 'PlaybackState', 'Default');
		X.add(track, 'AudioEngineState', 'RSE');
		const sound = X.add(X.add(track, 'Sounds'), 'Sound');
		for (const [tag, value] of Object.entries({
			Name: name,
			Label: name,
			Path: preset.path,
			Role: 'User',
		})) {
			X.add(sound, tag, value);
		}
		const midi = X.add(sound, 'MIDI');
		X.add(midi, 'LSB', 0);
		X.add(midi, 'MSB', 0);
		X.add(midi, 'Program', program);
		const rse = X.add(sound, 'RSE');
		X.add(rse, 'SoundbankPatch', preset.patch);
		X.add(rse, 'ElementsSettings');
		const pickups = X.add(rse, 'Pickups');
		X.add(pickups, 'OverloudPosition', 0);
		X.add(pickups, 'Volumes', '1 1');
		X.add(pickups, 'Tones', '1 1');
		X.add(rse, 'EffectChain');
		const automation = X.add(X.add(track, 'Automations'), 'Automation');
		for (const [tag, value] of Object.entries({
			Type: 'Sound',
			Linear: 'false',
			Bar: '0',
			Position: '0',
			Visible: 'true',
			Value: `${preset.path};${name};User`,
		})) {
			X.add(automation, tag, value);
		}
	}
}

// General MIDI program -> native instrument name, type and icon. Adapted from
// alphaTab 1.8.4 GpifSoundMapper, retaining the previous instrument assignments.
const instruments = [
	['Acoustic Piano', 'acousticPiano', 10],
	['Acoustic Piano', 'acousticPiano', 10],
	['Electric Piano', 'electricPiano', 10],
	['Acoustic Piano', 'acousticPiano', 10],
	['Electric Piano', 'electricPiano', 10],
	['Electric Piano', 'electricPiano', 10],
	['Harpsichord', 'harpsichord', 10],
	['Harpsichord', 'harpsichord', 10],
	['Celesta', 'celesta', 17],
	['Vibraphone', 'vibraphone', 17],
	['Vibraphone', 'vibraphone', 17],
	['Vibraphone', 'vibraphone', 17],
	['Xylophone', 'xylophone', 17],
	['Xylophone', 'xylophone', 17],
	['Vibraphone', 'vibraphone', 17],
	['Banjo', 'banjo', 8],
	['Electric Organ', 'electricOrgan', 10],
	['Electric Organ', 'electricOrgan', 10],
	['Electric Organ', 'electricOrgan', 10],
	['Electric Organ', 'electricOrgan', 10],
	['Electric Organ', 'electricOrgan', 10],
	['Electric Organ', 'electricOrgan', 10],
	['Recorder', 'recorder', 15],
	['Electric Organ', 'electricOrgan', 10],
	['Nylon Guitar', 'nylonGuitar', 23],
	['Steel Guitar', 'steelGuitar', 1],
	['Electric Guitar', 'electricGuitar', 1],
	['Electric Guitar', 'electricGuitar', 4],
	['Electric Guitar', 'electricGuitar', 4],
	['Electric Guitar', 'electricGuitar', 4],
	['Electric Guitar', 'electricGuitar', 1],
	['Electric Guitar', 'electricGuitar', 1],
	['Acoustic Bass', 'acousticBass', 5],
	['Electric Bass', 'electricBass', 5],
	['Electric Bass', 'electricBass', 5],
	['Acoustic Bass', 'acousticBass', 5],
	['Electric Bass', 'electricBass', 5],
	['Electric Bass', 'electricBass', 5],
	['Synth Bass', 'synthBass', 12],
	['Synth Bass', 'synthBass', 12],
	['Violin', 'violin', 11],
	['Viola', 'viola', 11],
	['Cello', 'cello', 11],
	['Contrabass', 'contrabass', 11],
	['Violin', 'violin', 11],
	['Violin', 'violin', 11],
	['Harp', 'harp', 10],
	['Timpani', 'timpani', 20],
	['Violin', 'violin', 11],
	['Violin', 'violin', 11],
	['Violin', 'violin', 11],
	['Violin', 'violin', 11],
	['Voice', 'voice', 16],
	['Voice', 'voice', 16],
	['Voice', 'voice', 16],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Trumpet', 'trumpet', 13],
	['Trombone', 'trombone', 13],
	['Tuba', 'tuba', 13],
	['Trumpet', 'trumpet', 13],
	['French Horn', 'frenchHorn', 13],
	['Trumpet', 'trumpet', 13],
	['Trumpet', 'trumpet', 13],
	['Trumpet', 'trumpet', 13],
	['Saxophone', 'saxophone', 14],
	['Saxophone', 'saxophone', 14],
	['Saxophone', 'saxophone', 14],
	['Saxophone', 'saxophone', 14],
	['Oboe', 'oboe', 14],
	['English Horn', 'englishHorn', 14],
	['Bassoon', 'bassoon', 14],
	['Clarinet', 'clarinet', 14],
	['Piccolo', 'piccolo', 14],
	['Flute', 'flute', 15],
	['Recorder', 'recorder', 15],
	['Flute', 'flute', 15],
	['Recorder', 'recorder', 15],
	['Flute', 'flute', 15],
	['Recorder', 'recorder', 15],
	['Flute', 'flute', 15],
	['Lead Synthesizer', 'leadSynthesizer', 12],
	['Lead Synthesizer', 'leadSynthesizer', 12],
	['Lead Synthesizer', 'leadSynthesizer', 12],
	['Lead Synthesizer', 'leadSynthesizer', 12],
	['Lead Synthesizer', 'leadSynthesizer', 12],
	['Lead Synthesizer', 'leadSynthesizer', 12],
	['Lead Synthesizer', 'leadSynthesizer', 12],
	['Lead Synthesizer', 'leadSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 12],
	['Pad Synthesizer', 'padSynthesizer', 21],
	['Pad Synthesizer', 'padSynthesizer', 21],
	['Pad Synthesizer', 'padSynthesizer', 21],
	['Pad Synthesizer', 'padSynthesizer', 21],
	['Lead Synthesizer', 'leadSynthesizer', 21],
	['Lead Synthesizer', 'leadSynthesizer', 21],
	['Lead Synthesizer', 'leadSynthesizer', 21],
	['Trumpet', 'trumpet', 21],
	['Banjo', 'banjo', 4],
	['Banjo', 'banjo', 8],
	['Ukulele', 'ukulele', 7],
	['Banjo', 'banjo', 8],
	['Xylophone', 'xylophone', 17],
	['Bassoon', 'bassoon', 14],
	['Violin', 'violin', 11],
	['Flute', 'flute', 15],
	['Xylophone', 'xylophone', 17],
	['Celesta', 'celesta', 19],
	['Vibraphone', 'vibraphone', 17],
	['Xylophone', 'xylophone', 19],
	['Xylophone', 'xylophone', 20],
	['Xylophone', 'xylophone', 20],
	['Xylophone', 'xylophone', 20],
	['Celesta', 'celesta', 19],
	['Steel Guitar', 'steelGuitar', 21],
	['Recorder', 'recorder', 21],
	['Recorder', 'recorder', 21],
	['Recorder', 'recorder', 21],
	['Recorder', 'recorder', 21],
	['Recorder', 'recorder', 21],
	['Recorder', 'recorder', 21],
	['Timpani', 'timpani', 21],
] as const;

interface Preset {
	patch: string;
	path: string;
}

// Standard GP7/8 soundbank identifiers. Variants share their instrument family's
// neutral sound; the original General MIDI program stays in the Sound's MIDI node.
const presets: Record<string, Preset> = {
	acousticPiano: {
		patch: 'German-APiano',
		path: 'Orchestra/Keyboard/Acoustic Piano',
	},
	electricPiano: {
		patch: 'MarkI-EPiano',
		path: 'Orchestra/Keyboard/Electric Piano',
	},
	harpsichord: {
		patch: 'Harpsichord-Key',
		path: 'Orchestra/Keyboard/Harpsichord',
	},
	celesta: { patch: 'Celesta-Tuned', path: 'Orchestra/Other/Celesta' },
	vibraphone: { patch: 'Vibraphone-Tuned', path: 'Orchestra/Other/Vibraphone' },
	xylophone: { patch: 'Xylophone-Tuned', path: 'Orchestra/Other/Xylophone' },
	banjo: {
		patch: '5-Banjo',
		path: 'Stringed/Other Stringed Instruments/Banjo',
	},
	electricOrgan: {
		patch: 'Jazz-Organ',
		path: 'Orchestra/Keyboard/Electric Organ',
	},
	recorder: { patch: 'Recorder-Solo', path: 'Orchestra/Winds/Recorder' },
	nylonGuitar: {
		patch: 'Concerto-Nylon',
		path: 'Stringed/Acoustic Guitars/Nylon Guitar',
	},
	steelGuitar: {
		patch: 'D-Steel',
		path: 'Stringed/Acoustic Guitars/Steel Guitar',
	},
	electricGuitar: {
		patch: 'Strat-Guitar',
		path: 'Stringed/Electric Guitars/Clean Guitar',
	},
	acousticBass: {
		patch: 'Acoustic-Bass',
		path: 'Stringed/Basses/Acoustic Bass',
	},
	electricBass: { patch: 'Pre-Bass', path: 'Stringed/Basses/Clean Bass' },
	synthBass: { patch: 'FMSyn-Bass', path: 'Orchestra/Synth/Bass' },
	violin: { patch: 'Violin-Solo', path: 'Orchestra/Strings/Violin' },
	viola: { patch: 'Viola-Solo', path: 'Orchestra/Strings/Viola' },
	cello: { patch: 'Cello-Solo', path: 'Orchestra/Strings/Cello' },
	contrabass: {
		patch: 'Contrabass-Solo',
		path: 'Orchestra/Strings/Contrabass',
	},
	harp: { patch: 'Harp-Solo', path: 'Orchestra/Strings/Harp' },
	timpani: { patch: 'TimpaniHi-Tuned', path: 'Orchestra/Other/Timpani' },
	voice: { patch: 'Vocal-Pad', path: 'Orchestra/Other/Singer' },
	padSynthesizer: { patch: 'Warm-Pad', path: 'Orchestra/Synth/Pad' },
	trumpet: { patch: 'Trumpet-Solo', path: 'Orchestra/Winds/Trumpet' },
	trombone: { patch: 'Trombone-Solo', path: 'Orchestra/Winds/Trombone' },
	tuba: { patch: 'BassTuba-Solo', path: 'Orchestra/Winds/Tuba' },
	frenchHorn: { patch: 'FrenchHorn-Solo', path: 'Orchestra/Winds/French Horn' },
	saxophone: { patch: 'Soprano-Sax', path: 'Orchestra/Winds/Saxophone' },
	oboe: { patch: 'Oboe-Solo', path: 'Orchestra/Winds/Oboe' },
	englishHorn: {
		patch: 'EnglishHorn-Solo',
		path: 'Orchestra/Winds/English Horn',
	},
	bassoon: { patch: 'Bassoon-Solo', path: 'Orchestra/Winds/Bassoon' },
	clarinet: { patch: 'Clarinet-Solo', path: 'Orchestra/Winds/Clarinet' },
	piccolo: { patch: 'Piccolo-Solo', path: 'Orchestra/Winds/Flute' },
	flute: { patch: 'Flute-Solo', path: 'Orchestra/Winds/Flute' },
	leadSynthesizer: { patch: 'Classic-Lead', path: 'Orchestra/Synth/Lead' },
	ukulele: {
		patch: 'CC-Ukulele',
		path: 'Stringed/Other Stringed Instruments/Ukulele',
	},
};
