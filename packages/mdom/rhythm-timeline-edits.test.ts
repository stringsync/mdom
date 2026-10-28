import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import type { Measure } from './measure';
import { schemaErrors } from './music-xml-schema';
import { MusicXMLSerializer } from './music-xml-serializer';
import type { Voice } from './voice';

function score(divisions?: number) {
	const doc = MDocument.empty();
	const part = doc.score.addPart({ id: 'P1', name: 'Rhythm' });
	const measure = part.addMeasure();
	measure.setTime({ beats: 4, beatType: 4 });
	if (divisions != null) {
		measure.setDivisions(divisions);
	}
	return { doc, measure, voice: measure.getOrCreateVoice('1') };
}

const xml = (doc: MDocument) => new MusicXMLSerializer().serializeToString(doc);
const rests = (voice: Voice) => voice.notes.filter((note) => note.isRest);

function expectRoundTrip(doc: MDocument, measure: Measure) {
	expect(schemaErrors(doc)).toEqual([]);
	const parsed = new MDOMParser().parseFromString(xml(doc));
	expect(xml(parsed)).toBe(xml(doc));
	expect(parsed.score.parts[0]!.measures[0]!.endBeat).toBe(measure.endBeat);
}

describe('timing-preserving rhythm edits', () => {
	it('replaces part of a rest and returns the next onset', () => {
		const { doc, measure, voice } = score();
		voice.addNote({ step: 'C', octave: 4, type: 'half' });
		const rest = voice.addRest({ type: 'half' });
		const next = voice.replaceRest(rest, {
			step: 'D',
			octave: 4,
			type: 'quarter',
		});
		expect(next).toBe(3);
		expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 2, 3]);
		expect(voice.notes.map((note) => note.type)).toEqual([
			'half',
			'quarter',
			'quarter',
		]);
		expect(voice.notes[2]!.isRest).toBe(true);
		expectRoundTrip(doc, measure);
	});

	it('shortens a note with a rest without moving the next note', () => {
		const { voice } = score();
		const first = voice.addNote({ step: 'C', octave: 4, type: 'half' });
		const next = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		voice.addNote({ step: 'E', octave: 4, type: 'quarter' });
		voice.resize(first, { type: 'quarter' });
		expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 1, 2, 3]);
		expect(voice.notes[2]).toBe(next);
		expect(next.measureBeat).toBe(2);
		expect(rests(voice).map((note) => note.type)).toEqual(['quarter']);
	});

	it('lengthens over a following note without changing the bar end', () => {
		const { measure, voice } = score();
		const notes = ['C', 'D', 'E', 'F'].map((step) =>
			voice.addNote({ step, octave: 4, type: 'quarter' }),
		);
		voice.resize(notes[0]!, { type: 'half' });
		expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 2, 3]);
		expect(voice.notes[1]).toBe(notes[2]);
		expect(voice.notes[2]).toBe(notes[3]);
		expect(measure.endBeat).toBe(4);
	});

	it('coalesces the rests left by deleting adjacent notes', () => {
		const { voice } = score();
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		voice.removeEntry(first);
		voice.removeEntry(second);
		expect(voice.notes).toHaveLength(1);
		expect(voice.notes[0]!.isRest).toBe(true);
		expect(voice.notes[0]!.type).toBe('half');
		expect(voice.notes[0]!.measureBeat).toBe(0);
	});

	it('removes one chord tone and promotes a removed lead', () => {
		const { voice } = score();
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
				{ step: 'G', octave: 4 },
			],
			{ type: 'whole' },
		);
		voice.removeEntry(chord.notes[0]!);
		expect(voice.chords[0]!.notes.map((note) => note.pitch?.step)).toEqual([
			'E',
			'G',
		]);
		expect(chord.notes[1]!.isChordMember).toBe(false);
		expect(chord.notes[2]!.isChordMember).toBe(true);
		voice.removeEntry(chord.notes[2]!);
		expect(voice.notes).toHaveLength(1);
		expect(voice.notes[0]).toBe(chord.notes[1]);
	});

	it('replaces a rest with a chord and fills its unused time', () => {
		const { measure, voice } = score();
		const rest = voice.addRest({ type: 'whole' });
		const next = voice.replaceRest(
			rest,
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'half' },
		);
		expect(next).toBe(2);
		expect(voice.chords).toHaveLength(2);
		expect(voice.chords[0]!.notes).toHaveLength(2);
		expect(voice.chords[0]!.measureBeat).toBe(0);
		expect(voice.chords[1]!.lead.isRest).toBe(true);
		expect(voice.chords[1]!.measureBeat).toBe(2);
		expect(measure.endBeat).toBe(4);
	});

	it('trims a partially overlapped note to a fixed later onset', () => {
		const { measure, voice } = score();
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const second = voice.addNote({ step: 'D', octave: 4, type: 'half' });
		const last = voice.addNote({ step: 'E', octave: 4, type: 'quarter' });
		voice.resize(first, { type: 'half' });
		expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 2, 3]);
		expect(voice.notes[1]).toBe(second);
		expect(second.type).toBe('quarter');
		expect(voice.notes[2]).toBe(last);
		expect(measure.endBeat).toBe(4);
	});

	it('resizes every chord member together', () => {
		const { voice } = score();
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'half' },
		);
		voice.addRest({ type: 'half' });
		voice.resize(chord.notes[1]!, { type: 'quarter' });
		expect(chord.notes.map((note) => note.type)).toEqual([
			'quarter',
			'quarter',
		]);
		expect(chord.notes.map((note) => note.beats)).toEqual([1, 1]);
		expect(rests(voice).map((note) => note.type)).toEqual(['quarter', 'half']);
		expect(voice.notes.at(-1)!.measureBeat).toBe(2);
	});

	it('fills a deleted tuplet note with a scaled rest', () => {
		const { voice } = score();
		const notes = Array.from({ length: 3 }, () =>
			voice.addNote({
				step: 'C',
				octave: 4,
				type: 'eighth',
				timeModification: { actual: 3, normal: 2 },
			}),
		);
		voice.removeEntry(notes[0]!);
		expect(voice.notes[0]!.isRest).toBe(true);
		expect(voice.notes[0]!.beats).toBe(1 / 3);
		expect(voice.notes[0]!.timeModification).toMatchObject({
			actual: 3,
			normal: 2,
		});
		expect(voice.notes[1]).toBe(notes[1]);
		expect(voice.notes[1]!.measureBeat).toBe(1 / 3);
	});

	it('keeps sibling voices, staves, and unaffected spans intact', () => {
		const { doc, measure, voice } = score();
		const first = voice.addNote({ step: 'C', octave: 4, type: 'half' });
		const rest = voice.addRest({ type: 'half' });
		const lower = measure.getOrCreateVoice('2', { staff: '2' });
		const bass = lower.addNote({ step: 'C', octave: 3, type: 'whole' });
		const slur = first.addSlur(bass);
		voice.replaceRest(rest, { step: 'D', octave: 4, type: 'quarter' });
		expect(bass.measureBeat).toBe(0);
		expect(bass.beats).toBe(4);
		expect(bass.staff).toBe('2');
		expect(slur.partner?.note).toBe(bass);
		expect(measure.endBeat).toBe(4);
		expectRoundTrip(doc, measure);
	});

	it('rejects bar overruns and unrepresentable edits without mutation', () => {
		const overrun = score();
		overrun.voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const note = overrun.voice.addNote({
			step: 'D',
			octave: 4,
			type: 'quarter',
		});
		overrun.voice.addRest({ type: 'half' });
		const before = xml(overrun.doc);
		expect(() => overrun.voice.resize(note, { type: 'whole' })).toThrow(
			'overrun',
		);
		expect(xml(overrun.doc)).toBe(before);

		const fractional = score(3);
		const short = fractional.voice.addNote({
			step: 'C',
			octave: 4,
			type: 'quarter',
		});
		const fractionalBefore = xml(fractional.doc);
		expect(() =>
			fractional.voice.resize(short, { type: 'quarter', dots: 1 }),
		).toThrow('fractional duration');
		expect(xml(fractional.doc)).toBe(fractionalBefore);
	});

	it('refuses to overwrite tied entries without mutation', () => {
		const { doc, voice } = score();
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		first.addTie(second);
		const before = xml(doc);
		expect(() => voice.resize(first, { type: 'half' })).toThrow('ties');
		expect(xml(doc)).toBe(before);
	});

	it('splits a rest through rest-to-rest replacement', () => {
		const { voice } = score();
		const first = voice.addRest({ type: 'half' });
		voice.addRest({ type: 'half' });
		expect(voice.replaceRest(first, { type: 'quarter' })).toBe(1);
		expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 1, 2]);
		expect(voice.notes.map((note) => note.type)).toEqual([
			'quarter',
			'quarter',
			'half',
		]);
		expect(voice.notes.every((note) => note.isRest)).toBe(true);
	});

	it('trims a partially overlapped rest and merges its remainder', () => {
		const { voice } = score();
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		voice.addRest({ type: 'half' });
		const last = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		voice.resize(first, { type: 'half' });
		expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 2, 3]);
		expect(voice.notes[1]!.isRest).toBe(true);
		expect(voice.notes[1]!.type).toBe('quarter');
		expect(voice.notes[2]).toBe(last);
	});

	it('splits rest runs at the middle of a 4/4 measure', () => {
		const { voice } = score();
		const notes = ['C', 'D', 'E', 'F'].map((step) =>
			voice.addNote({ step, octave: 4, type: 'quarter' }),
		);
		voice.removeEntry(notes[1]!);
		voice.removeEntry(notes[2]!);
		expect(rests(voice).map((note) => note.type)).toEqual([
			'quarter',
			'quarter',
		]);
		expect(rests(voice).map((note) => note.measureBeat)).toEqual([1, 2]);
	});

	it('lengthens into unused bar space while anchoring a sibling voice', () => {
		const { measure, voice } = score();
		const note = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const bass = measure
			.getOrCreateVoice('2', { staff: '2' })
			.addNote({ step: 'C', octave: 3, type: 'whole' });
		voice.resize(note, { type: 'half' });
		expect(note.beats).toBe(2);
		expect(bass.measureBeat).toBe(0);
		expect(bass.beats).toBe(4);
		expect(measure.endBeat).toBe(4);
	});

	it('deletes a whole chord as one occupied interval', () => {
		const { voice } = score();
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'half' },
		);
		const next = voice.addNote({ step: 'D', octave: 4, type: 'half' });
		voice.removeEntry(chord);
		expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 2]);
		expect(voice.notes[0]!.isRest).toBe(true);
		expect(voice.notes[0]!.type).toBe('half');
		expect(voice.notes[1]).toBe(next);
	});

	it('uses dotted rests within compound-meter beat groups', () => {
		const { measure, voice } = score();
		measure.setTime({ beats: 6, beatType: 8 });
		const notes = ['C', 'D'].map((step) =>
			voice.addNote({ step, octave: 4, type: 'quarter', dots: 1 }),
		);
		voice.removeEntry(notes[0]!);
		voice.removeEntry(notes[1]!);
		expect(voice.notes.map((note) => note.type)).toEqual([
			'quarter',
			'quarter',
		]);
		expect(voice.notes.map((note) => note.dots)).toEqual([1, 1]);
		expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 1.5]);
		expect(measure.endBeat).toBe(3);
	});
});
