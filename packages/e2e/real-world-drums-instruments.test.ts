import { describe, expect, it } from "bun:test";
import { EXAMPLES, loadScore } from "./examples";

describe("Finale, drum kit instrument metadata", () => {
	const part = loadScore(EXAMPLES.DRUM_TUPLET_BEAMS_MEASURE).parts[0]!;

	it("reads the kit identity, its part-wide device, and its MIDI playback", () => {
		expect(part.instruments).toEqual([
			{
				id: "P1-I2",
				name: "SmartMusic SoftSynth",
				abbreviation: null,
				sound: "drum.group.set",
				solo: false,
				ensemble: { size: null },
				virtualInstrument: { library: null, name: null },
			},
		]);
		expect(part.getMidiDevice("P1-I2")).toEqual({
			id: null,
			port: null,
			name: "SmartMusic SoftSynth",
		});
		expect(part.getMidiInstrument("P1-I2")).toMatchObject({
			channel: 1,
			bank: 15361,
			program: 1,
			volume: 80,
			pan: 0,
			unpitched: null,
		});
	});
});
