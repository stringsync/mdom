import { describe, expect, it } from "bun:test";
import { MDocument, MElement } from "./index";
import { schemaErrors } from "./music-xml-schema";

describe("sound automation, writing", () => {
	const build = () => {
		const doc = MDocument.empty();
		const measure = doc.score
			.addPart({ id: "P1", name: "Strings" })
			.addMeasure();
		return { doc, measure };
	};

	it("writes pedals, pan and elevation as attributes", () => {
		const { doc, measure } = build();
		const sound = measure.addDirection({
			words: "Ped.",
			sound: {
				damperPedal: true,
				softPedal: 50,
				sostenutoPedal: false,
				pan: 30,
				elevation: -10,
			},
		}).sound!;
		expect(sound.getAttribute("damper-pedal")).toBe("yes");
		expect(sound.getAttribute("sostenuto-pedal")).toBe("no");
		expect(sound.damperPedal).toBe(100);
		expect(sound.softPedal).toBe(50);
		expect(sound.sostenutoPedal).toBe(0);
		expect(sound.pan).toBe(30);
		expect(sound.elevation).toBe(-10);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("writes midi children grouped by instrument, a part-wide device first", () => {
		const { doc, measure } = build();
		const sound = measure.addDirection({
			words: "arco",
			sound: {
				midiInstruments: [
					{ id: "I1", program: 49 },
					{ id: "I2", program: 41, volume: 70 },
				],
				midiDevices: [{ id: "I2", port: 3 }, { name: "Synth" }],
			},
		}).sound!;
		expect(
			sound.children.flatMap((child) =>
				child instanceof MElement
					? [`${child.tag}:${child.getAttribute("id")}`]
					: [],
			),
		).toEqual([
			"midi-device:null",
			"midi-device:I2",
			"midi-instrument:I2",
			"midi-instrument:I1",
		]);
		expect(sound.midiInstruments.map((midi) => midi.program)).toEqual([41, 49]);
		expect(sound.midiDevices).toEqual([
			{ id: null, port: null, name: "Synth" },
			{ id: "I2", port: 3, name: null },
		]);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("rejects out-of-range values", () => {
		const { measure } = build();
		expect(() =>
			measure.addDirection({ words: "Ped.", sound: { damperPedal: 120 } }),
		).toThrow("damper-pedal must be a number from 0 to 100");
		expect(() =>
			measure.addDirection({ words: "pan", sound: { pan: 200 } }),
		).toThrow("pan must be a number from -180 to 180");
		expect(() =>
			measure.addDirection({
				words: "pizz.",
				sound: { midiInstruments: [{ id: "I1", program: 0 }] },
			}),
		).toThrow("midi-program");
	});
});
