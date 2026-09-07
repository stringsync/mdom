import { beforeEach, describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import { MusicXMLSerializer } from './music-xml-serializer';

describe('Guitar Pro playback', () => {
	let serializer: GuitarProSerializer;
	let document: MDocument;

	beforeEach(() => {
		serializer = new GuitarProSerializer();
		document = MDocument.empty();
		document.score
			.addPart({ name: 'Piano' })
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
	});

	it('assigns a built-in piano sound without a MIDI output device', async () => {
		const track = (
			await exportedTracks(await serializer.serializeToBytes(document))
		)[0]!;

		expect(track.child('AudioEngineState')?.text).toBe('RSE');
		expect(track.child('PlaybackState')?.text).toBe('Default');
		expect(
			track
				.child('Sounds')
				?.child('Sound')
				?.child('RSE')
				?.child('SoundbankPatch')?.text,
		).toBe('German-APiano');
		expect(
			track.child('Sounds')?.child('Sound')?.child('MIDI')?.child('Program')
				?.text,
		).toBe('0');
	});

	it('connects the opening sound automation to the complete sound definition', async () => {
		const track = (
			await exportedTracks(await serializer.serializeToBytes(document))
		)[0]!;
		const sound = track.child('Sounds')!.child('Sound')!;
		const automation = track.child('Automations')!.child('Automation')!;

		expect(sound.child('Path')?.text).toBe('Orchestra/Keyboard/Acoustic Piano');
		expect(automation.child('Type')?.text).toBe('Sound');
		expect(automation.child('Bar')?.text).toBe('0');
		expect(automation.child('Position')?.text).toBe('0');
		expect(automation.child('Value')?.text).toBe(
			`${sound.child('Path')?.text};${sound.child('Name')?.text};${sound.child('Role')?.text}`,
		);
		expect(sound.child('RSE')?.child('Pickups')?.child('Volumes')?.text).toBe(
			'1 1',
		);
	});

	it('assigns the native steel guitar sound to tablature', async () => {
		document = await new GuitarProParser().parseFromBlob(
			Bun.file(new URL('./fixtures/guitar-pro/strings.gp', import.meta.url)),
		);
		const track = (
			await exportedTracks(await serializer.serializeToBytes(document))
		)[0]!;

		expect(track.child('AudioEngineState')?.text).toBe('RSE');
		expect(
			track
				.child('Sounds')
				?.child('Sound')
				?.child('RSE')
				?.child('SoundbankPatch')?.text,
		).toBe('D-Steel');
		expect(
			track.child('Sounds')?.child('Sound')?.child('MIDI')?.child('Program')
				?.text,
		).toBe('25');
	});

	it('matches the piano soundbank assignment in an independently authored GP8 file', async () => {
		const native = new MDOMParser().parseFromString(
			await Bun.file(
				new URL('./fixtures/guitar-pro/piano-playback.gpif', import.meta.url),
			).text(),
		).root;
		const track = (
			await exportedTracks(await serializer.serializeToBytes(document))
		)[0]!;

		expect(track.child('AudioEngineState')?.text).toBe(
			native.child('AudioEngineState')?.text,
		);
		expect(
			track
				.child('Sounds')
				?.child('Sound')
				?.child('RSE')
				?.child('SoundbankPatch')?.text,
		).toBe(
			native
				.child('Sounds')
				?.child('Sound')
				?.child('RSE')
				?.child('SoundbankPatch')?.text,
		);
		expect(track.child('Sounds')?.child('Sound')?.child('Path')?.text).toBe(
			native.child('Sounds')?.child('Sound')?.child('Path')?.text,
		);
	});

	it('retains musical data and metadata while configuring playback', async () => {
		const measure = document.score.parts[0]!.measures[0]!;
		const direction = measure.addDirection({
			tempo: 90,
			metronome: { beatUnit: 'quarter', perMinute: 90 },
		});
		measure.insertBefore(direction, measure.notes[0]!);
		const result = await new GuitarProParser().parseFromBytes(
			await serializer.serializeToBytes(document),
		);

		expect(result.score.parts[0]!.label).toBe('Piano');
		expect(result.score.parts[0]!.measures[0]!.notes[0]).toMatchObject({
			beats: 4,
			pitch: { step: 'C', octave: 4 },
		});
		expect(
			result.score.parts[0]!.measures[0]!.sounds.map((sound) => sound.tempo),
		).toContain(90);
	});

	it.each(
		Array.from({ length: 128 }, (_, index) => index + 1),
	)('assigns a built-in sound and retains MIDI program %i', async (program) => {
		const instrument = new MElement('midi-instrument');
		instrument.setAttribute('id', 'I1');
		const midiProgram = new MElement('midi-program');
		midiProgram.setText(String(program));
		instrument.append(midiProgram);
		document.score.child('part-list')!.child('score-part')!.append(instrument);
		const bytes = await serializer.serializeToBytes(document);
		const track = (await exportedTracks(bytes))[0]!;
		const result = await new GuitarProParser().parseFromBytes(bytes);

		expect(track.child('AudioEngineState')?.text).toBe('RSE');
		expect(
			track
				.child('Sounds')
				?.child('Sound')
				?.child('RSE')
				?.child('SoundbankPatch')?.text,
		).toMatch(/\S+/);
		expect(new MusicXMLSerializer().serializeToString(result)).toContain(
			`<midi-program>${program}</midi-program>`,
		);
	});
});

async function exportedTracks(bytes: Uint8Array): Promise<MElement[]> {
	const zip = await JSZip.loadAsync(bytes);
	return new MDOMParser()
		.parseFromString(await zip.file('Content/score.gpif')!.async('string'))
		.root.child('Tracks')!
		.childrenNamed('Track');
}
