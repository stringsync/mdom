import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { schemaErrors } from './music-xml-schema';
import { MusicXMLSerializer } from './music-xml-serializer';

const build = () => {
	const doc = MDocument.empty();
	const measure = doc.score.addPart({ id: 'P1', name: 'Guitar' }).addMeasure();
	measure.setDivisions(4);
	measure.setClef({ sign: 'G', line: 2 });
	measure.setTime({ beats: 4, beatType: 4 });
	const voice = measure.getOrCreateVoice('1');
	return { doc, measure, voice };
};

describe('beat mark writers', () => {
	it('writes and clears fermata, arpeggio and tremolo', () => {
		const { doc, voice } = build();
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'half' },
		);
		const note = chord.lead;
		note.setFermata('inverted');
		note.setArpeggiate({ direction: 'down' });
		note.setTremolo(3);
		expect(note.fermata).toBe('inverted');
		expect(note.arpeggiate).toEqual({ direction: 'down' });
		const tremolo = note.ornaments.find((o) => o.tag === 'tremolo');
		expect(tremolo?.tremoloMarks).toBe(3);
		expect(tremolo?.tremoloType).toBe('single');
		expect(schemaErrors(doc)).toEqual([]);

		note.setFermata('upright');
		note.setTremolo(2);
		expect(note.fermata).toBe('upright');
		expect(note.ornaments.filter((o) => o.tag === 'tremolo')).toHaveLength(1);
		note.setFermata(null);
		note.setArpeggiate(null);
		note.setTremolo(null);
		expect(note.fermata).toBeNull();
		expect(note.arpeggiate).toBeNull();
		expect(note.ornaments).toHaveLength(0);
		expect(() => note.setTremolo(9)).toThrow();
	});

	it('spans an ottava over notes and survives a round trip', () => {
		const { doc, measure, voice } = build();
		const first = voice.addChord(
			[
				{ step: 'C', octave: 6 },
				{ step: 'E', octave: 6 },
			],
			{ type: 'quarter' },
		);
		voice.addNote({ step: 'D', octave: 6, type: 'quarter' });
		const last = voice.addNote({ step: 'E', octave: 6, type: 'half' });
		const start = first.lead.addOctaveShift(last, '8va');
		expect(start.ottava).toBe('8va');
		expect(start.octaveShiftType).toBe('down');
		expect(start.partner?.octaveShiftType).toBe('stop');
		expect(start.measureBeat).toBe(0);
		expect(start.partner?.measureBeat).toBe(4);
		expect(measure.notes.map((n) => n.measureBeat)).toEqual([0, 0, 1, 2]);
		expect(schemaErrors(doc)).toEqual([]);

		const xml = new MusicXMLSerializer().serializeToString(doc);
		expect(xml).toContain('size="8"');
	});

	it('numbers a second overlapping ottava apart', () => {
		const { voice } = build();
		const a = voice.addNote({ step: 'C', octave: 6, type: 'half' });
		const b = voice.addNote({ step: 'D', octave: 6, type: 'half' });
		const one = a.addOctaveShift(b, '15ma');
		const two = a.addOctaveShift(b, '8vb');
		expect(one.number).toBe('1');
		expect(two.number).toBe('2');
		expect(two.ottava).toBe('8vb');
	});
});
