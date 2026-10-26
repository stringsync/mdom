import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('Finale — a drum measure of tuplets and beams', () => {
	const measure = loadScore(EXAMPLES.DRUM_TUPLET_BEAMS_MEASURE).parts[0]!
		.measures[0]!;

	it('reads each drum as a staff position, not a pitch', () => {
		const positions = measure.notes
			.filter((note) => note.unpitched)
			.map((note) => note.unpitched);
		expect(positions).toHaveLength(10);
		expect(positions[0]).toEqual({ step: 'C', octave: 5 }); // a different row from...
		expect(positions[1]).toEqual({ step: 'A', octave: 4 }); // ...this one
	});

	it('groups the beams and places the measure content', () => {
		expect(measure.beamRuns().map((run) => run.notes.length)).toEqual([5, 5]);
		expect(measure.endBeat).toBe(2);
		expect(
			measure.notes
				.flatMap((note) => note.tuplets)
				.map((tuplet) => tuplet.tupletType),
		).toEqual(['start', 'stop', 'start', 'stop']);
	});
});

describe('Finale — drum kit instrument metadata', () => {
	const part = loadScore(EXAMPLES.DRUM_TUPLET_BEAMS_MEASURE).parts[0]!;

	it('reads the kit identity, its part-wide device, and its MIDI playback', () => {
		expect(part.instruments).toEqual([
			{
				id: 'P1-I2',
				name: 'SmartMusic SoftSynth',
				abbreviation: null,
				sound: 'drum.group.set',
				solo: false,
				ensemble: { size: null },
				virtualInstrument: { library: null, name: null },
			},
		]);
		expect(part.getMidiDevice('P1-I2')).toEqual({
			id: null,
			port: null,
			name: 'SmartMusic SoftSynth',
		});
		expect(part.getMidiInstrument('P1-I2')).toMatchObject({
			channel: 1,
			bank: 15361,
			program: 1,
			volume: 80,
			pan: 0,
			unpitched: null,
		});
	});
});
