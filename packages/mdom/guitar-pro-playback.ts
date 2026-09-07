import JSZip from 'jszip';
import { MDOMParser } from './m-dom-parser';
import { MElement, required } from './m-node';
import { MusicXMLSerializer } from './music-xml-serializer';

/** Assigns built-in instrument sounds to exported Guitar Pro tracks. */
export class GuitarProPlayback {
	async configure(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
		// alphaTab 1.8.4 forces MIDI output and has no RSE export option.
		const zip = await JSZip.loadAsync(bytes);
		const file = required(zip.file('Content/score.gpif'), 'exported GPIF');
		const document = new MDOMParser().parseFromString(
			await file.async('string'),
		);
		const tracks = required(document.root.child('Tracks'), 'exported tracks');
		for (const track of tracks.childrenNamed('Track')) {
			this.configureTrack(track);
		}
		zip.file(
			'Content/score.gpif',
			new MusicXMLSerializer().serializeToString(document),
		);
		return new Uint8Array(
			await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }),
		);
	}

	private configureTrack(track: MElement): void {
		const instrument = required(
			track.child('InstrumentSet'),
			'track instrument',
		);
		const type = required(instrument.child('Type')?.text, 'instrument type');
		const preset = presets[type];
		if (!preset) {
			throw new Error(`No built-in Guitar Pro sound for instrument: ${type}`);
		}
		const sounds = required(track.child('Sounds'), 'track sounds');
		const sound = required(sounds.child('Sound'), 'initial track sound');
		const name = required(instrument.child('Name')?.text, 'instrument name');
		this.replace(sound, 'Name', name);
		this.replace(sound, 'Label', name);
		this.replace(sound, 'Path', preset.path);
		this.replace(sound, 'Role', 'User');
		const rse = new MElement('RSE');
		this.replace(rse, 'SoundbankPatch', preset.patch);
		rse.append(new MElement('ElementsSettings'));
		const pickups = new MElement('Pickups');
		this.replace(pickups, 'OverloudPosition', '0');
		this.replace(pickups, 'Volumes', '1 1');
		this.replace(pickups, 'Tones', '1 1');
		rse.append(pickups);
		rse.append(new MElement('EffectChain'));
		sound.append(rse);
		this.replace(track, 'AudioEngineState', 'RSE');
		const automations = required(
			track.child('Automations'),
			'track automations',
		);
		for (const automation of automations.childrenNamed('Automation')) {
			if (automation.child('Type')?.text === 'Sound') {
				this.replace(automation, 'Value', `${preset.path};${name};User`);
			}
		}
	}

	private replace(parent: MElement, tag: string, value: string): void {
		const element = parent.child(tag) ?? new MElement(tag);
		// setText alone would leave alphaTab's old CDATA value in the element.
		for (const child of [...element.children]) {
			child.remove();
		}
		element.setText(value);
		if (!element.parent) {
			parent.append(element);
		}
	}
}

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
