import { beforeEach, describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import type { Measure } from './measure';
import { MusicXMLSerializer } from './music-xml-serializer';

describe('GuitarProSerializer', () => {
	let serializer: GuitarProSerializer;
	let document: MDocument;
	let measure: Measure;

	beforeEach(() => {
		serializer = new GuitarProSerializer();
		document = MDocument.empty();
		measure = document.score.addPart({ name: 'Piano' }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: 'G', line: 2 });
	});

	it('writes pitch and rhythm fields independently of the mdom reader', async () => {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', alter: 1, octave: 4, type: 'quarter', dots: 1 });
		const gpif = await gpifOf(await serializer.serializeToBlob(document));

		expect(
			gpif.child('Rhythms')?.childrenNamed('Rhythm')[0]?.child('NoteValue')
				?.text,
		).toBe('Quarter');
		expect(
			gpif
				.child('Rhythms')
				?.childrenNamed('Rhythm')[0]
				?.child('AugmentationDot')
				?.getAttribute('count'),
		).toBe('1');
		expect(
			gpif
				.child('Notes')
				?.childrenNamed('Note')[0]
				?.child('Properties')
				?.childrenNamed('Property')
				.find((p) => p.getAttribute('name') === 'ConcertPitch')
				?.child('Pitch')
				?.child('Step')?.text,
		).toBe('C');
		expect(
			gpif
				.child('Notes')
				?.childrenNamed('Note')[0]
				?.child('Properties')
				?.childrenNamed('Property')
				.find((p) => p.getAttribute('name') === 'ConcertPitch')
				?.child('Pitch')
				?.child('Accidental')?.text,
		).toBe('#');
	});

	it('puts simultaneous chord pitches on one GPIF beat', async () => {
		measure.getOrCreateVoice('1').addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
				{ step: 'G', octave: 4 },
			],
			{ type: 'whole' },
		);
		const gpif = await gpifOf(await serializer.serializeToBlob(document));

		expect(gpif.child('Beats')?.childrenNamed('Beat')).toHaveLength(1);
		expect(
			gpif
				.child('Beats')
				?.childrenNamed('Beat')[0]
				?.child('Notes')
				?.text?.split(' '),
		).toHaveLength(3);
		expect(gpif.child('Notes')?.childrenNamed('Note')).toHaveLength(3);
	});

	it('writes rests as beats without notes', async () => {
		measure.getOrCreateVoice('1').addRest({ type: 'whole' });
		const gpif = await gpifOf(await serializer.serializeToBlob(document));

		expect(gpif.child('Beats')?.childrenNamed('Beat')).toHaveLength(1);
		expect(
			gpif.child('Beats')?.childrenNamed('Beat')[0]?.child('Notes'),
		).toBeNull();
		expect(gpif.child('Notes')?.childrenNamed('Note')).toEqual([]);
	});

	it('keeps voices separate in GPIF', async () => {
		measure
			.getOrCreateVoice('upper')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		measure
			.getOrCreateVoice('lower')
			.addNote({ step: 'C', octave: 3, type: 'whole' });
		const gpif = await gpifOf(await serializer.serializeToBlob(document));

		expect(gpif.child('Voices')?.childrenNamed('Voice')).toHaveLength(2);
		expect(
			gpif
				.child('Bars')
				?.childrenNamed('Bar')[0]
				?.child('Voices')
				?.text?.split(' '),
		).toHaveLength(2);
	});

	it('writes meter and repeat boundaries', async () => {
		measure.setTime({ beats: 3, beatType: 4 });
		measure.addBarline({ location: 'left', repeat: { direction: 'forward' } });
		measure.getOrCreateVoice('1').addRest({ type: 'half', dots: 1 });
		measure.addBarline({ repeat: { direction: 'backward', times: 3 } });
		const gpif = await gpifOf(await serializer.serializeToBlob(document));
		const master = gpif.child('MasterBars')?.child('MasterBar');

		expect(master?.child('Time')?.text).toBe('3/4');
		expect(master?.child('Repeat')?.attributes).toMatchObject({
			start: 'true',
			end: 'true',
			count: '3',
		});
	});

	it('writes explicit tempo changes', async () => {
		measure.addDirection({
			metronome: { beatUnit: 'quarter', perMinute: 96 },
			tempo: 96,
		});
		measure.getOrCreateVoice('1').addRest({ type: 'whole' });
		const gpif = await gpifOf(await serializer.serializeToBlob(document));

		expect(
			gpif
				.child('MasterTrack')
				?.child('Automations')
				?.child('Automation')
				?.child('Value')?.text,
		).toBe('96 2');
	});

	it('leaves the source MusicXML unchanged', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', alter: -1, octave: 4, type: 'whole' });
		note.addArticulation('staccato');
		const before = new MusicXMLSerializer().serializeToString(document);
		await serializer.serializeToBlob(document);

		expect(new MusicXMLSerializer().serializeToString(document)).toBe(before);
	});

	it('rejects notation whose duration disagrees with its type', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'quarter' });
		note.child('duration')!.setText('1');

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'duration disagrees',
		);
	});

	it('rejects chord members with different durations', async () => {
		const chord = measure.getOrCreateVoice('1').addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'quarter' },
		);
		chord.notes[1]!.child('duration')!.setText('128');

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'chord members must share',
		);
	});

	it('rejects microtonal pitches instead of rounding them', async () => {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, alter: 0.5, type: 'quarter' });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'Invalid MIDI pitch',
		);
	});

	it('rejects parts with different measure counts', async () => {
		document.score.addPart({ name: 'Bass' }).addMeasure();
		document.score.parts[0]!.addMeasure();

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'same number of measures',
		);
	});

	it('rejects conflicting meters across parts', async () => {
		document.score
			.addPart({ name: 'Bass' })
			.addMeasure()
			.setTime({ beats: 3, beatType: 4 });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'matching meter',
		);
	});

	it('rejects more than four voices on a staff', async () => {
		measure.getOrCreateVoice('1').addRest({ type: 'whole' });
		measure.getOrCreateVoice('2').addRest({ type: 'whole' });
		measure.getOrCreateVoice('3').addRest({ type: 'whole' });
		measure.getOrCreateVoice('4').addRest({ type: 'whole' });
		measure.getOrCreateVoice('5').addRest({ type: 'whole' });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'at most four voices',
		);
	});

	it('rejects unsupported annotations by default', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const lyric = new MElement('lyric');
		note.append(lyric);

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'<lyric>',
		);
	});

	it('exports core notes when omitting annotations is explicitly requested', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		note.append(new MElement('lyric'));
		const gpif = await gpifOf(
			await serializer.serializeToBlob(document, { unsupported: 'omit' }),
		);

		expect(gpif.child('Notes')?.childrenNamed('Note')).toHaveLength(1);
	});

	it('rejects malformed core notation even when omission is requested', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'quarter' });
		note.child('duration')!.setText('0');

		await expect(
			serializer.serializeToBlob(document, { unsupported: 'omit' }),
		).rejects.toThrow('duration disagrees');
	});

	it('rejects notes on an undeclared staff instead of dropping them', async () => {
		measure
			.getOrCreateVoice('1', { staff: '2' })
			.addNote({ step: 'C', octave: 4, type: 'whole' });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'declared staff',
		);
	});

	it('rejects dangling ties instead of silently removing them', async () => {
		const first = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'half' });
		const next = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'half' });
		first.addTie(next);
		next.remove();

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'ties must connect',
		);
	});

	it('rejects a whole rest whose duration would change with the meter', async () => {
		measure.setTime({ beats: 3, beatType: 4 });
		measure.getOrCreateVoice('1').addRest({ type: 'whole' });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'duration disagrees',
		);
	});

	it('rejects mid-measure tempo changes outside the initial subset', async () => {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'half' });
		measure.addDirection({
			tempo: 100,
			metronome: { beatUnit: 'quarter', perMinute: 100 },
		});
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'half' });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'mid-measure tempo',
		);
	});

	it('rejects mid-measure key changes outside the initial subset', async () => {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		measure.setKey({ fifths: 1, onset: 1 });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'mid-measure key or time',
		);
	});

	it('rejects an unknown technical mark', async () => {
		const note = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const notations = new MElement('notations');
		const technical = new MElement('technical');
		technical.append(new MElement('custom-technique'));
		notations.append(technical);
		note.append(notations);

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'<custom-technique>',
		);
	});

	it('rejects unsupported clefs without inventing a replacement', async () => {
		measure.setClef({ sign: 'percussion' });

		await expect(serializer.serializeToBlob(document)).rejects.toThrow(
			'Unsupported Guitar Pro clef',
		);
	});
});

async function gpifOf(blob: Blob): Promise<MElement> {
	const zip = await JSZip.loadAsync(await blob.arrayBuffer());
	return new MDOMParser().parseFromString(
		await zip.file('Content/score.gpif')!.async('string'),
	).root;
}
