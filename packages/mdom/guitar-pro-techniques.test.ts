import { describe, expect, it } from 'bun:test';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import type { Note } from './note';

const fixture = (name: string) =>
	Bun.file(new URL(`./fixtures/guitar-pro/${name}`, import.meta.url));

describe('Guitar Pro note techniques', () => {
	const parser = new GuitarProParser();

	it('imports bends from a fixture', async () => {
		const doc = await parser.parseFromBlob(fixture('bends.gp'), {
			unsupported: 'omit',
		});
		const bends = doc.score.parts[0]!.measures.flatMap((m) =>
			m.notes.filter((n) => n.bend),
		);
		expect(bends.length).toBeGreaterThan(0);
	});

	it('imports harmonics and dead notes from fixtures', async () => {
		const harmonics = await parser.parseFromBlob(fixture('harmonics.gp'), {
			unsupported: 'omit',
		});
		expect(
			harmonics.score.parts[0]!.measures.flatMap((m) =>
				m.notes.filter((n) => n.harmonic),
			).length,
		).toBeGreaterThan(0);
		const dead = await parser.parseFromBlob(fixture('dead.gp'));
		expect(
			dead.score.parts[0]!.measures.flatMap((m) =>
				m.notes.filter((n) => n.notehead?.value === 'x'),
			).length,
		).toBeGreaterThan(0);
	});

	it('round trips a whammy bar dip through the beat', async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: 'Piano' }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: 'G', line: 2 });
		const voice = measure.getOrCreateVoice('v');
		const dip = voice.addNote({ step: 'C', octave: 4, type: 'half' });
		dip.setBend({ semitones: -2, release: true, withBar: 'dip' });
		voice.addNote({ step: 'D', octave: 4, type: 'half' });

		const bytes = await new GuitarProSerializer().serializeToBytes(document);
		const restored = (await parser.parseFromBytes(bytes)).score.parts[0]!
			.measures[0]!.notes;

		expect(restored[0]!.bend).toMatchObject({
			semitones: -2,
			release: true,
			withBar: 'dip',
		});
		expect(restored[1]!.bend).toBeNull();
	});

	it('round trips every technique through GPIF', async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: 'Piano' }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: 'G', line: 2 });
		const voice = measure.getOrCreateVoice('v');
		const notes = ['C', 'D', 'E', 'F'].map((step) =>
			voice.addNote({ step, octave: 4, type: 'quarter' }),
		);
		notes[0]!.setBend({ semitones: 2 });
		notes[1]!.setBend({ semitones: 1, release: true });
		notes[2]!.setBend({ semitones: 2, preBend: true });
		notes[3]!.setHarmonic({ kind: 'artificial', pitch: 'touching' });
		notes[3]!.setPalmMuted(true);
		notes[3]!.setLetRing(true);
		notes[0]!.setNotehead({ value: 'x', parentheses: true });

		const bytes = await new GuitarProSerializer().serializeToBytes(document);
		const restored = (await parser.parseFromBytes(bytes)).score.parts[0]!
			.measures[0]!.notes;

		expect(restored.map((n) => n.bend)).toMatchObject([
			{ semitones: 2, preBend: false, release: false },
			{ semitones: 1, preBend: false, release: true },
			{ semitones: 2, preBend: true, release: false },
			null,
		]);
		expect(restored[3]!.harmonic).toEqual({
			kind: 'artificial',
			pitch: 'touching',
		});
		expect(restored[3]!.isPalmMuted).toBe(true);
		expect(restored[3]!.isLetRing).toBe(true);
		expect(restored[0]!.notehead).toMatchObject({
			value: 'x',
			parentheses: true,
		});
	});

	it('imports hammer-ons, dropping one with no note after it', async () => {
		const doc = await parser.parseFromBlob(fixture('hammer.gp'));
		const notes = doc.score.parts[0]!.measures.flatMap((m) => m.notes);
		const starts = notes
			.flatMap((n) => n.hammerOns)
			.filter((marker) => marker.hammerOnType === 'start');
		expect(starts.length).toBe(9);
		for (const start of starts) {
			expect(start.partner?.note.slurs.length).toBeGreaterThan(0);
		}
	});

	it('imports slides into, out of and between notes', async () => {
		const doc = await parser.parseFromBlob(fixture('slides.gp'));
		const notes = doc.score.parts[0]!.measures.flatMap((m) => m.notes);
		expect(notes.map((n) => n.slides.map((s) => s.slideType))).toEqual([
			['start'],
			['start'],
			['stop'],
			['stop'],
			['start'],
			['stop'],
			[],
			[],
			[],
			[],
		]);
		// Flag 2, a legato slide, also slurs; flag 1, a shift slide, does not.
		expect(notes.map((n) => n.slurs.length)).toEqual([
			1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
		]);
		expect(notes.slice(6).map((n) => n.articulations)).toEqual([
			['scoop'],
			['plop'],
			['falloff'],
			['doit'],
		]);
	});

	it('imports note vibrato as wavy lines', async () => {
		const doc = await parser.parseFromBlob(fixture('vibrato.gp'));
		const notes = doc.score.parts[0]!.measures.flatMap((m) => m.notes);
		const covered = notes.filter((n) => n.wavyLines.length);
		expect(covered.length).toBe(2);
		for (const note of covered) {
			expect(note.wavyLines[0]!.partner?.note).toBe(note);
		}
	});

	it('round trips legato, slides and vibrato through GPIF', async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: 'Guitar' }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: 'G', line: 2 });
		const voice = measure.getOrCreateVoice('v');
		const notes = ['C', 'D', 'C', 'E', 'G', 'A', 'B', 'C'].map((step) =>
			voice.addNote({ step, octave: 4, type: 'eighth' }),
		);
		const [c, d, back, e, g, a, b, last] = notes as [
			Note,
			Note,
			Note,
			Note,
			Note,
			Note,
			Note,
			Note,
		];
		c.addHammerOn(d);
		c.addSlur(d);
		d.addPullOff(back);
		d.addSlur(back);
		back.addSlide(e);
		e.addSlide(g);
		e.addSlur(g);
		g.addArticulation('scoop');
		a.addArticulation('falloff');
		a.addVibrato(b);
		last.addVibrato(last).setAttribute('smufl', 'wiggleVibratoWide');

		const bytes = await new GuitarProSerializer().serializeToBytes(document);
		const restored = (await parser.parseFromBytes(bytes)).score.parts[0]!
			.measures[0]!.notes;

		expect(restored[0]!.hammerOns[0]!.partner?.note).toBe(restored[1]!);
		expect(restored[1]!.pullOffs[0]!.partner?.note).toBe(restored[2]!);
		expect(restored[2]!.slides[0]!.partner?.note).toBe(restored[3]!);
		expect(restored[2]!.slurs.length).toBe(1);
		expect(restored[3]!.slides[1]!.partner?.note).toBe(restored[4]!);
		expect(restored[4]!.slurs.length).toBe(1);
		expect(restored[4]!.articulations).toEqual(['scoop']);
		expect(restored[5]!.articulations).toEqual(['falloff']);
		expect(restored.map((n) => n.wavyLines.length)).toEqual([
			0, 0, 0, 0, 0, 2, 2, 2,
		]);
		expect(restored[7]!.wavyLines[0]!.getAttribute('smufl')).toBe(
			'wiggleVibratoWide',
		);
	});

	it('round trips plain slurs through GPIF beat legato', async () => {
		const document = MDocument.empty();
		const part = document.score.addPart({ name: 'Guitar' });
		const first = part.addMeasure();
		first.setTime({ beats: 4, beatType: 4 });
		first.setClef({ sign: 'G', line: 2 });
		const second = part.addMeasure();
		const notes = [
			...['C', 'D', 'E', 'F'].map((step) =>
				first
					.getOrCreateVoice('1')
					.addNote({ step, octave: 4, type: 'quarter' }),
			),
			...['G', 'A'].map((step) =>
				second.getOrCreateVoice('1').addNote({ step, octave: 4, type: 'half' }),
			),
		];
		notes[0]!.addSlur(notes[1]!);
		// Over three beats and across the barline.
		notes[2]!.addSlur(notes[4]!);

		const bytes = await new GuitarProSerializer().serializeToBytes(document);
		const restored = (
			await parser.parseFromBytes(bytes)
		).score.parts[0]!.measures.flatMap((measure) => measure.notes);

		expect(restored.map((note) => note.slurs.length)).toEqual([
			1, 1, 1, 0, 1, 0,
		]);
		expect(restored[0]!.slurs[0]!.partner?.note).toBe(restored[1]!);
		expect(restored[2]!.slurs[0]!.partner?.note).toBe(restored[4]!);
		expect(restored.flatMap((note) => note.hammerOns)).toEqual([]);
	});

	it('refuses slurs Guitar Pro would merge or cannot join', async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: 'Guitar' }).addMeasure();
		const voice = measure.getOrCreateVoice('1');
		const [first, second, third] = ['C', 'D', 'E'].map((step) =>
			voice.addNote({ step, octave: 4, type: 'quarter' }),
		);
		first!.addSlur(second!);
		second!.addSlur(third!);
		const lower = measure.getOrCreateVoice('2');
		first!.addSlur(lower.addNote({ step: 'C', octave: 3, type: 'whole' }));

		const omitted: string[] = [];
		const bytes = await new GuitarProSerializer().serializeToBytes(document, {
			unsupported: 'omit',
			onUnsupported: (feature) => omitted.push(feature),
		});
		expect(omitted.sort()).toEqual([
			'slurs that do not join later notes of one voice',
			'slurs that share a note',
		]);
		const restored = (await parser.parseFromBytes(bytes)).score.parts[0]!
			.measures[0]!.notes;
		expect(restored[0]!.slurs[0]!.partner?.note).toBe(restored[1]!);
		expect(restored.flatMap((note) => note.slurs).length).toBe(2);
	});

	it('writes slurs between the same two chords as one slur', async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: 'Guitar' }).addMeasure();
		const voice = measure.getOrCreateVoice('1');
		const [first, second] = [
			['C', 'E'],
			['D', 'F'],
		].map((steps) =>
			voice.addChord(
				steps.map((step) => ({ step, octave: 4 })),
				{ type: 'half' },
			),
		);
		for (const [index, note] of first!.notes.entries()) {
			note.addSlur(second!.notes[index]!);
		}

		const omitted: string[] = [];
		const bytes = await new GuitarProSerializer().serializeToBytes(document, {
			unsupported: 'omit',
			onUnsupported: (feature) => omitted.push(feature),
		});
		expect(omitted).toEqual([]);
		const restored = (await parser.parseFromBytes(bytes)).score.parts[0]!
			.measures[0]!.notes;
		const slurs = restored.flatMap((note) => note.slurs);
		expect(slurs.length).toBe(2);
		expect(restored[0]!.slurs[0]!.partner?.note).toBe(restored[2]!);
	});

	it('exports a glissando as the slide it plays as', async () => {
		const document = MDocument.empty();
		const measure = document.score.addPart({ name: 'Guitar' }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: 'G', line: 2 });
		const voice = measure.getOrCreateVoice('v');
		const [c, g, e] = ['C', 'G', 'E'].map((step) =>
			voice.addNote({ step, octave: 4, type: 'quarter' }),
		) as [Note, Note, Note];
		c.addGlissando(g, { lineType: 'wavy' });
		g.addGlissando(e);
		g.addSlur(e);

		const bytes = await new GuitarProSerializer().serializeToBytes(document);
		const restored = (await parser.parseFromBytes(bytes)).score.parts[0]!
			.measures[0]!.notes;

		expect(restored[0]!.slides[0]!.partner?.note).toBe(restored[1]!);
		expect(restored[0]!.slurs).toEqual([]);
		expect(restored[1]!.slides[1]!.partner?.note).toBe(restored[2]!);
		expect(restored[1]!.slurs.length).toBe(1);
	});
});
