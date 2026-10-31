import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { guitarProDrumKit } from "./guitar-pro-drum-kit";
import { GuitarProParser } from "./guitar-pro-parser";
import { GuitarProSerializer } from "./guitar-pro-serializer";
import type { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import type { MElement } from "./m-element";
import { schemaErrors } from "./music-xml-schema";
import { MusicXMLSerializer } from "./music-xml-serializer";
import type { Note } from "./note";

const fixture = (name: string) =>
	new Uint8Array(
		readFileSync(new URL(`./fixtures/guitar-pro/${name}`, import.meta.url)),
	);

const xml = (document: MDocument) =>
	new MusicXMLSerializer().serializeToString(document);

async function gpifOf(bytes: Uint8Array): Promise<MElement> {
	const zip = await JSZip.loadAsync(bytes);
	return new MDOMParser().parseFromString(
		await zip.file("Content/score.gpif")!.async("string"),
	).root;
}

async function archive(gpif: string): Promise<Uint8Array> {
	const zip = new JSZip();
	zip.file("Content/score.gpif", gpif);
	return zip.generateAsync({ type: "uint8array" });
}

/** The drum a note plays: its instrument's name and MIDI key, staff position and notehead. */
function drum(note: Note) {
	const part = note.part;
	const id = note.instrumentIds[0]!;
	return {
		name: part.getInstrument(id)?.name,
		key: part.getMidiInstrument(id)?.unpitched,
		position: note.unpitched,
		notehead: note.notehead?.value ?? null,
	};
}

/** A GPIF score of one percussion track, one bar of quarter notes. */
function percussionGpif(track: string, notes: string[]): string {
	const ids = notes.map((_, index) => index);
	return `<GPIF><MasterTrack><Tracks>0</Tracks></MasterTrack>
<Tracks><Track id="0"><Name>Drums</Name>${track}</Track></Tracks>
<MasterBars><MasterBar><Time>${notes.length}/4</Time><Bars>0</Bars></MasterBar></MasterBars>
<Bars><Bar id="0"><Clef>Neutral</Clef><Voices>0</Voices></Bar></Bars>
<Voices><Voice id="0"><Beats>${ids.join(" ")}</Beats></Voice></Voices>
<Beats>${ids.map((id) => `<Beat id="${id}"><Rhythm ref="0"/><Notes>${id}</Notes></Beat>`).join("")}</Beats>
<Notes>${notes.map((note, id) => `<Note id="${id}">${note}</Note>`).join("")}</Notes>
<Rhythms><Rhythm id="0"><NoteValue>Quarter</NoteValue></Rhythm></Rhythms></GPIF>`;
}

describe("Guitar Pro percussion import", () => {
	it("reads drum-tabs.gp as unpitched notes, one instrument per drum", async () => {
		const document = await new GuitarProParser().parseFromBytes(
			fixture("drum-tabs.gp"),
		);
		const part = document.score.parts[0]!;
		const measure = part.measures[0]!;

		expect(measure.getClef("1")?.sign).toBe("percussion");
		expect(measure.getStaffDetails("1")).toBeNull();
		expect(measure.notes.every((note) => note.child("unpitched"))).toBe(true);
		expect(part.instruments).toHaveLength(63);
		expect(part.instruments[0]).toMatchObject({
			id: "P1-I1",
			name: "Snare (hit)",
		});
		expect(part.getMidiInstrument("P1-I1")).toMatchObject({
			channel: 10,
			unpitched: 39,
		});
		expect(measure.notes.slice(2, 3).map(drum)).toEqual([
			{
				name: "Snare (side stick)",
				key: 41,
				position: { step: "C", octave: 5 },
				notehead: "slashed",
			},
		]);
		const kick = part.measures
			.flatMap((measure) => measure.notes)
			.find((note) => drum(note).name === "Kick (hit)")!;
		expect(drum(kick)).toEqual({
			name: "Kick (hit)",
			key: 36,
			position: { step: "E", octave: 4 },
			notehead: null,
		});
		expect(schemaErrors(document)).toEqual([]);
	});

	it("reads a Guitar Pro 5 drum track by the General MIDI key in its fret", async () => {
		const gpif = percussionGpif(
			'<GeneralMidi table="Percussion"><Program>0</Program><PrimaryChannel>9</PrimaryChannel></GeneralMidi>',
			[42, 38, 36].map(
				(key) =>
					`<Properties><Property name="String"><String>0</String></Property><Property name="Fret"><Fret>${key}</Fret></Property></Properties>`,
			),
		);
		const document = await new GuitarProParser().parseFromBytes(
			await archive(gpif),
		);

		expect(document.score.parts[0]!.measures[0]!.notes.map(drum)).toEqual([
			{
				name: "Hi-Hat (closed)",
				key: 43,
				position: { step: "G", octave: 5 },
				notehead: "x",
			},
			{
				name: "Snare (hit)",
				key: 39,
				position: { step: "C", octave: 5 },
				notehead: null,
			},
			{
				name: "Kick (hit)",
				key: 37,
				position: { step: "F", octave: 4 },
				notehead: null,
			},
		]);
	});

	it("reads a Guitar Pro 6 drum by its element and variation", async () => {
		const gpif = percussionGpif(
			"<InstrumentSet><Type>drumKit</Type></InstrumentSet>",
			[
				'<Properties><Property name="Element"><Element>1</Element></Property><Property name="Variation"><Variation>1</Variation></Property></Properties>',
			],
		);
		const document = await new GuitarProParser().parseFromBytes(
			await archive(gpif),
		);

		expect(drum(document.score.parts[0]!.measures[0]!.notes[0]!).name).toBe(
			"Snare (rim shot)",
		);
	});

	it("rejects a drum no kit articulation plays", async () => {
		const gpif = percussionGpif(
			'<GeneralMidi table="Percussion"><Program>0</Program><PrimaryChannel>9</PrimaryChannel></GeneralMidi>',
			[
				'<Properties><Property name="Fret"><Fret>5</Fret></Property></Properties>',
			],
		);

		expect(
			new GuitarProParser().parseFromBytes(await archive(gpif)),
		).rejects.toThrow("Unknown Guitar Pro drum: 5");
	});
});

describe("Guitar Pro percussion export", () => {
	function drumScore(): MDocument {
		const document =
			new MDOMParser().parseFromString(`<score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>Kit</part-name></score-part></part-list>
      <part id="P1"><measure number="1"><attributes>
        <divisions>1</divisions><time><beats>3</beats><beat-type>4</beat-type></time>
        <clef><sign>percussion</sign></clef>
      </attributes></measure></part></score-partwise>`);
		const part = document.score.parts[0]!;
		const voice = part.measures[0]!.getOrCreateVoice("1");
		const hiHat = part.addInstrument({ name: "Hi-Hat (closed)" });
		part.setMidiInstrument(hiHat.id!, { channel: 10, unpitched: 43 });
		const hiHatNote = voice.addUnpitched({
			type: "quarter",
			step: "G",
			octave: 5,
		});
		hiHatNote.setInstrumentIds([hiHat.id!]);
		hiHatNote.setNotehead({ value: "x" });
		const snare = part.addInstrument({ name: "Snare (hit)" });
		part.setMidiInstrument(snare.id!, { channel: 10, unpitched: 39 });
		voice
			.addUnpitched({ type: "quarter", step: "C", octave: 5 })
			.setInstrumentIds([snare.id!]);
		const kick = part.addInstrument({ name: "Kick (hit)" });
		part.setMidiInstrument(kick.id!, { channel: 10, unpitched: 37 });
		voice
			.addUnpitched({ type: "quarter", step: "F", octave: 4 })
			.setInstrumentIds([kick.id!]);
		return document;
	}

	it("writes the standard drum kit and indexes it by General MIDI key", async () => {
		const gpif = await gpifOf(
			await new GuitarProSerializer().serializeToBytes(drumScore()),
		);
		const track = gpif.child("Tracks")!.child("Track")!;

		expect(track.child("InstrumentSet")!.child("Type")!.text).toBe("drumKit");
		expect(
			track
				.child("InstrumentSet")!
				.child("Elements")!
				.childrenNamed("Element")
				.flatMap((element) =>
					element.child("Articulations")!.childrenNamed("Articulation"),
				),
		).toHaveLength(guitarProDrumKit.length);
		expect(track.child("MidiConnection")!.child("PrimaryChannel")!.text).toBe(
			"9",
		);
		expect(gpif.child("Bars")!.child("Bar")!.child("Clef")!.text).toBe(
			"Neutral",
		);
		const articulations = gpif
			.child("Notes")!
			.childrenNamed("Note")
			.map(
				(note) =>
					guitarProDrumKit[Number(note.child("InstrumentArticulation")!.text)]!
						.name,
			);
		expect(articulations).toEqual([
			"Hi-Hat (closed)",
			"Snare (hit)",
			"Kick (hit)",
		]);
	});

	it("round-trips drum-tabs.gp unchanged", async () => {
		const parser = new GuitarProParser();
		const imported = await parser.parseFromBytes(fixture("drum-tabs.gp"));
		const restored = await parser.parseFromBytes(
			await new GuitarProSerializer().serializeToBytes(imported),
		);

		expect(xml(restored)).toBe(xml(imported));
	});

	it("takes the kit drum on a note’s line when nothing names it, and reports it", async () => {
		const document = drumScore();
		const part = document.score.parts[0]!;
		part.measures[0]!.notes.map((note) => note.setInstrumentIds([]));
		part.instruments.map((instrument) => part.removeInstrument(instrument.id!));
		const omitted: string[] = [];
		const restored = await new GuitarProParser().parseFromBytes(
			await new GuitarProSerializer().serializeToBytes(document, {
				unsupported: "omit",
				onUnsupported: (feature) => omitted.push(feature),
			}),
		);

		expect(
			restored.score.parts[0]!.measures[0]!.notes.map(
				(note) => drum(note).name,
			),
		).toEqual(["Hi-Hat (closed)", "Snare (hit)", "Kick (hit)"]);
		expect(omitted).toContain(
			"percussion instruments without a General MIDI drum key",
		);
	});

	it("prefers the kit name among drums sharing a General MIDI key", async () => {
		const document = drumScore();
		const part = document.score.parts[0]!;
		part.setInstrument(part.instruments[1]!.id!, { name: "Snare (rim shot)" });
		part.measures[0]!.notes[1]!.setNotehead({ value: "diamond" });
		const restored = await new GuitarProParser().parseFromBytes(
			await new GuitarProSerializer().serializeToBytes(document),
		);

		expect(drum(restored.score.parts[0]!.measures[0]!.notes[1]!)).toMatchObject(
			{ name: "Snare (rim shot)", key: 39, notehead: "diamond" },
		);
	});

	it("carries a kit drum’s technique symbol as a technical and back to that drum", async () => {
		const symbols = [
			"stringsUpBow",
			"stringsDownBow",
			"articStaccatoAbove",
			"guitarGolpe",
		];
		const indexes = symbols.map((symbol) =>
			guitarProDrumKit.findIndex((drum) => drum.techniqueSymbol === symbol),
		);
		const gpif = percussionGpif(
			'<GeneralMidi table="Percussion"><Program>0</Program><PrimaryChannel>9</PrimaryChannel></GeneralMidi>',
			indexes.map(
				(index) =>
					`<Properties><Property name="Midi"><Number>${guitarProDrumKit[index]!.id}</Number></Property></Properties>`,
			),
		);
		const imported = await new GuitarProParser().parseFromBytes(
			await archive(gpif),
		);
		const notes = imported.score.parts[0]!.measures[0]!.notes;

		expect(notes[0]!.bowing).toBe("up");
		expect(notes[1]!.bowing).toBe("down");
		expect(notes[2]!.otherTechnicalGlyphs).toEqual(["articStaccatoAbove"]);
		expect(notes[3]!.otherTechnicalGlyphs).toEqual(["guitarGolpe"]);

		const exported = await gpifOf(
			await new GuitarProSerializer().serializeToBytes(imported),
		);
		expect(
			exported
				.child("Notes")!
				.childrenNamed("Note")
				.map(
					(note) =>
						guitarProDrumKit[
							Number(note.child("InstrumentArticulation")!.text)
						]!.techniqueSymbol,
				),
		).toEqual(symbols);
	});

	it("adds the drums a part names, places or draws differently to the kit", async () => {
		const document = drumScore();
		const part = document.score.parts[0]!;
		const [hiHat, snare, kick] = part.measures[0]!.notes;
		part.setInstrument(snare!.instrumentIds[0]!, { name: "Backbeat" });
		kick!.setUnpitched({ step: "D", octave: 4 });
		hiHat!.setNotehead({ value: "triangle" });
		const bytes = await new GuitarProSerializer().serializeToBytes(document);
		const kit = (await gpifOf(bytes))
			.child("Tracks")!
			.child("Track")!
			.child("InstrumentSet")!
			.child("Elements")!
			.childrenNamed("Element");
		const restored = await new GuitarProParser().parseFromBytes(bytes);

		expect(
			kit
				.flatMap((element) =>
					element.child("Articulations")!.childrenNamed("Articulation"),
				)
				.slice(guitarProDrumKit.length)
				.map((articulation) => articulation.child("Name")!.text),
		).toEqual(["Hi-Hat (closed)", "Backbeat", "Kick (hit)"]);
		expect(restored.score.parts[0]!.measures[0]!.notes.map(drum)).toEqual(
			part.measures[0]!.notes.map(drum),
		);
	});

	it("keeps a Guitar Pro file’s custom drum kit", async () => {
		const gpif = percussionGpif(
			`<InstrumentSet><Name>Drums</Name><Type>drumKit</Type><Elements>
<Element><Name>Snare</Name><Type>snare</Type><SoundbankName>Master-Snare</SoundbankName><Articulations>
<Articulation><Name>Ghost</Name><StaffLine>4</StaffLine><Noteheads>noteheadDiamondWhite noteheadDiamondWhite noteheadDiamondWhite</Noteheads><TechniquePlacement>outside</TechniquePlacement><TechniqueSymbol/><InputMidiNumbers>38</InputMidiNumbers><OutputRSESound>stick.hit.hit</OutputRSESound><OutputMidiNumber>38</OutputMidiNumber></Articulation>
</Articulations></Element>
<Element><Name>Kick Drum</Name><Type>kickDrum</Type><SoundbankName>Master-Kick</SoundbankName><Articulations>
<Articulation><Name>Kick (hit)</Name><StaffLine>7</StaffLine><Noteheads>noteheadBlack noteheadHalf noteheadWhole</Noteheads><TechniquePlacement>outside</TechniquePlacement><TechniqueSymbol/><InputMidiNumbers>36</InputMidiNumbers><OutputRSESound>pedal.hit.hit</OutputRSESound><OutputMidiNumber>36</OutputMidiNumber></Articulation>
</Articulations></Element>
</Elements></InstrumentSet>`,
			[0, 1, 0].map(
				(index) => `<InstrumentArticulation>${index}</InstrumentArticulation>`,
			),
		);
		const parser = new GuitarProParser();
		const imported = await parser.parseFromBytes(await archive(gpif));
		const bytes = await new GuitarProSerializer().serializeToBytes(imported);
		const restored = await parser.parseFromBytes(bytes);
		const notes = (await gpifOf(bytes)).child("Notes")!.childrenNamed("Note");

		expect(restored.score.parts[0]!.measures[0]!.notes.map(drum)).toEqual([
			{
				name: "Ghost",
				key: 39,
				position: { step: "B", octave: 4 },
				notehead: "diamond",
			},
			{
				name: "Kick (hit)",
				key: 37,
				position: { step: "F", octave: 4 },
				notehead: null,
			},
			{
				name: "Ghost",
				key: 39,
				position: { step: "B", octave: 4 },
				notehead: "diamond",
			},
		]);
		expect(
			notes.map((note) => Number(note.child("InstrumentArticulation")!.text)),
		).toEqual([
			guitarProDrumKit.length,
			guitarProDrumKit.findIndex((drum) => drum.element === "Kick Drum"),
			guitarProDrumKit.length,
		]);
	});

	it("rejects a part mixing pitched and unpitched notes", async () => {
		const document = drumScore();
		document.score.parts[0]!.measures[0]!.notes[0]!.setPitch({
			step: "C",
			octave: 4,
		});

		expect(
			new GuitarProSerializer().serializeToBytes(document),
		).rejects.toThrow("cannot mix pitched and unpitched notes");
	});
});

describe("Unpitched note writers", () => {
	it("adds an unpitched note at a staff position and replaces it in place", () => {
		const document =
			new MDOMParser().parseFromString(`<score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>Kit</part-name></score-part></part-list>
      <part id="P1"><measure number="1"/></part></score-partwise>`);
		const voice = document.score.parts[0]!.measures[0]!.getOrCreateVoice("1");
		const note = voice.addUnpitched({ type: "half", step: "C", octave: 5 });
		const bare = voice.addUnpitched({ type: "half" });

		expect(note.unpitched).toEqual({ step: "C", octave: 5 });
		expect(note.pitch).toBeNull();
		expect(bare.child("unpitched")).not.toBeNull();
		expect(bare.unpitched).toBeNull();
		note.setUnpitched({ step: "F", octave: 4 });
		expect(note.unpitched).toEqual({ step: "F", octave: 4 });
		note.setPitch({ step: "D", octave: 4 });
		expect(note.child("unpitched")).toBeNull();
		expect(schemaErrors(document)).toEqual([]);
	});
});
