import { describe, expect, it } from 'bun:test';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';

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

	it('still rejects slides', async () => {
		await expect(parser.parseFromBlob(fixture('slides.gp'))).rejects.toThrow(
			'note techniques',
		);
	});
});
