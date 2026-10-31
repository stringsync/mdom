import { describe, expect, it } from "bun:test";
import { MDOMParser, MDocument, MusicXMLSerializer } from "./index";
import { schemaErrors } from "./music-xml-schema";

const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);
const roundTrip = (doc: MDocument) =>
	new MDOMParser().parseFromString(serialize(doc));

function divisiPart() {
	const doc = MDocument.empty();
	const part = doc.score.addPart({ id: "P1", name: "Flutes" });
	const voice = part.addMeasure().getOrCreateVoice("1");
	voice.addNote({ step: "C", octave: 5, type: "half" });
	voice.addNote({ step: "D", octave: 5, type: "half" });
	return { doc, part };
}

describe("instrument metadata", () => {
	it("reads absent instruments as empty without mutating the score-part", () => {
		const { doc, part } = divisiPart();
		const before = serialize(doc);
		expect(part.instruments).toEqual([]);
		expect(part.midiInstruments).toEqual([]);
		expect(part.midiDevices).toEqual([]);
		expect(part.getInstrument("P1-I1")).toBeNull();
		expect(part.getMidiInstrument("P1-I1")).toBeNull();
		expect(part.getMidiDevice("P1-I1")).toBeNull();
		expect(part.measures[0]!.notes[0]!.instrumentIds).toEqual([]);
		part.setMidiDevice(null, null);
		expect(serialize(doc)).toBe(before);
	});

	it("writes several instruments, their MIDI, devices and note assignments in schema order", () => {
		const { doc, part } = divisiPart();
		part.setAbbreviation("Fl.");
		const first = part.addInstrument({
			name: "Flute 1",
			abbreviation: "Fl. 1",
			sound: "wind.flutes.flute",
			solo: true,
			virtualInstrument: { library: "Garritan", name: "Flute" },
		});
		const second = part.addInstrument({
			name: "Flute 2",
			ensemble: { size: 3 },
		});
		expect([first.id, second.id]).toEqual(["P1-I1", "P1-I2"]);
		// Written out of order: the device lands before its own instrument.
		part.setMidiInstrument("P1-I2", {
			channel: 2,
			program: 74,
			volume: 62.5,
			pan: -45,
		});
		part.setMidiInstrument("P1-I1", {
			channel: 1,
			name: "Flute",
			bank: 16384,
			program: 74,
			unpitched: 1,
			volume: 100,
			pan: 180,
			elevation: -180,
		});
		part.setMidiDevice("P1-I2", { port: 16, name: "Synth B" });
		part.setMidiDevice(null, { name: "Synth" });
		const [upper, lower] = part.measures[0]!.notes;
		upper!.setInstrumentIds(["P1-I1"]);
		lower!.setInstrumentIds(["P1-I1", "P1-I2"]);
		expect(schemaErrors(doc)).toEqual([]);

		const xml = serialize(doc).replace(/>\s+</g, "><");
		expect(xml.indexOf("<part-abbreviation>")).toBeLessThan(
			xml.indexOf("<score-instrument"),
		);
		expect(xml).toContain(
			'<midi-device>Synth</midi-device><midi-device id="P1-I2" port="16">Synth B</midi-device><midi-instrument id="P1-I2">',
		);
		expect(xml).toMatch(/<duration>\d+<\/duration><instrument id="P1-I1"\/>/);

		const restored = roundTrip(doc).score.getPart("P1")!;
		expect(restored.instruments).toEqual(part.instruments);
		expect(restored.instruments[1]).toEqual({
			id: "P1-I2",
			name: "Flute 2",
			abbreviation: null,
			sound: null,
			solo: false,
			ensemble: { size: 3 },
			virtualInstrument: null,
		});
		expect(restored.midiInstruments).toEqual(part.midiInstruments);
		expect(restored.getMidiInstrument("P1-I1")).toEqual({
			id: "P1-I1",
			channel: 1,
			name: "Flute",
			bank: 16384,
			program: 74,
			unpitched: 1,
			volume: 100,
			pan: 180,
			elevation: -180,
		});
		expect(restored.getMidiDevice("P1-I2")?.port).toBe(16);
		expect(restored.getMidiDevice("P1-I1")).toEqual({
			id: null,
			port: null,
			name: "Synth",
		});
		expect(
			restored.measures[0]!.notes.map((note) => note.instrumentIds),
		).toEqual([["P1-I1"], ["P1-I1", "P1-I2"]]);
		// The first MIDI instrument in the document still answers `program`.
		expect(restored.program).toBe(74);
	});

	it("does not assign an instrument to notes that name none", () => {
		const doc = new MDOMParser().parseFromString(
			'<score-partwise><part-list><score-part id="P1"><part-name>Kit</part-name><score-instrument id="P1-I1"><instrument-name>Snare</instrument-name></score-instrument><score-instrument id="P1-I2"><instrument-name>Kick</instrument-name></score-instrument><midi-instrument id="P1-I2"><midi-unpitched>36</midi-unpitched></midi-instrument></score-part></part-list><part id="P1"><measure number="1"><note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched><duration>1</duration><instrument id="P1-I2"/><voice>1</voice></note><note><rest/><duration>1</duration></note></measure></part></score-partwise>',
		);
		const part = doc.score.getPart("P1")!;
		const [kick, rest] = part.measures[0]!.notes;
		expect(kick!.instrumentIds).toEqual(["P1-I2"]);
		expect(rest!.instrumentIds).toEqual([]);
		expect(part.getMidiInstrument("P1-I1")).toBeNull();
		expect(part.getMidiInstrument("P1-I2")?.unpitched).toBe(36);
	});

	it("reads malformed numbers as null and keeps unknown XML through edits", () => {
		const doc = new MDOMParser().parseFromString(
			'<score-partwise><part-list><score-part id="P1"><part-name>P</part-name><score-instrument id="P1-I1"><instrument-name/><ensemble>many</ensemble><future/></score-instrument><midi-device port="17"/><midi-instrument id="P1-I1"><midi-channel>0</midi-channel><volume>101</volume><pan>left</pan><elevation>.5</elevation></midi-instrument><extension kept="yes"/></score-part></part-list><part id="P1"><measure number="1"/></part></score-partwise>',
		);
		const part = doc.score.getPart("P1")!;
		expect(part.instruments[0]).toMatchObject({
			name: null,
			ensemble: { size: null },
		});
		expect(part.midiDevices).toEqual([{ id: null, port: null, name: null }]);
		expect(part.getMidiInstrument("P1-I1")).toMatchObject({
			channel: null,
			volume: null,
			pan: null,
			elevation: 0.5,
		});
		part.setMidiInstrument("P1-I1", { channel: 3 });
		expect(part.getMidiInstrument("P1-I1")).toMatchObject({
			channel: 3,
			volume: null,
			elevation: null,
		});
		expect(serialize(doc)).toContain('<extension kept="yes"/>');
	});

	it("edits and removes instruments with their MIDI assignments", () => {
		const { doc, part } = divisiPart();
		part.addInstrument({ id: "flute", name: "Flute" });
		part.addInstrument({ name: "Piccolo" });
		part.setMidiInstrument("flute", { program: 74 });
		part.setMidiDevice("flute", { name: "Synth" });
		part.setInstrument("flute", {
			name: "Alto Flute",
			sound: "wind.flutes.flute.alto",
		});
		expect(part.getInstrument("flute")).toMatchObject({
			name: "Alto Flute",
			sound: "wind.flutes.flute.alto",
		});
		expect(part.getMidiInstrument("flute")?.program).toBe(74);

		const note = part.measures[0]!.notes[0]!;
		note.setInstrumentIds(["flute"]);
		expect(() => part.removeInstrument("flute")).toThrow(/still play/);
		note.setInstrumentIds([]);
		part.removeInstrument("flute");
		expect(part.instruments.map((each) => each.id)).toEqual(["P1-I1"]);
		expect(part.midiInstruments).toEqual([]);
		expect(part.midiDevices).toEqual([]);
		part.setMidiInstrument("P1-I1", { program: 73 });
		part.setMidiInstrument("P1-I1", null);
		expect(part.midiInstruments).toEqual([]);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("rejects ids and values MusicXML cannot hold", () => {
		const { part } = divisiPart();
		part.addInstrument({ name: "Flute" });
		expect(() => part.addInstrument({ id: "P1", name: "Clash" })).toThrow(
			/already used/,
		);
		expect(() => part.addInstrument({ id: "P1-I1", name: "Again" })).toThrow();
		expect(() =>
			part.addInstrument({ name: "Both", solo: true, ensemble: {} }),
		).toThrow();
		expect(() =>
			part.addInstrument({ name: "Ensemble", ensemble: { size: 0 } }),
		).toThrow();
		expect(() => part.setMidiInstrument("missing", { program: 1 })).toThrow(
			/no instrument/,
		);
		expect(() =>
			part.measures[0]!.notes[0]!.setInstrumentIds(["missing"]),
		).toThrow(/no instrument/);
		expect(() => part.setMidiInstrument("P1-I1", { channel: 0 })).toThrow();
		expect(() => part.setMidiInstrument("P1-I1", { channel: 17 })).toThrow();
		expect(() => part.setMidiInstrument("P1-I1", { bank: 16385 })).toThrow();
		expect(() => part.setMidiInstrument("P1-I1", { program: 1.5 })).toThrow();
		expect(() => part.setMidiInstrument("P1-I1", { unpitched: 129 })).toThrow();
		expect(() => part.setMidiInstrument("P1-I1", { volume: -1 })).toThrow();
		expect(() => part.setMidiInstrument("P1-I1", { pan: 181 })).toThrow();
		expect(() =>
			part.setMidiInstrument("P1-I1", { elevation: Number.NaN }),
		).toThrow();
		expect(() => part.setMidiDevice(null, { port: 0 })).toThrow();
		expect(part.midiInstruments).toEqual([]);
		expect(part.midiDevices).toEqual([]);
	});
});
