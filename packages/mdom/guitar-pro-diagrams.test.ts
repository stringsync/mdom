import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { GuitarProParser } from "./guitar-pro-parser";
import { GuitarProSerializer } from "./guitar-pro-serializer";
import type { Harmony } from "./harmony";
import { MDocument } from "./m-document";
import { schemaErrors } from "./music-xml-schema";

const fixture = (name: string) =>
	new Uint8Array(
		readFileSync(new URL(`./fixtures/guitar-pro/${name}`, import.meta.url)),
	);

function summary(harmony: Harmony) {
	return {
		root: harmony.root,
		kind: harmony.kind?.value,
		text: harmony.kind?.text,
		bass: harmony.bass && [harmony.bass.step, harmony.bass.alter],
		degrees: harmony.degrees.map((harmonyDegree) => [
			harmonyDegree.type,
			harmonyDegree.value,
			harmonyDegree.alter,
		]),
		printFrame: harmony.printFrame,
		frame: harmony.frame && {
			strings: harmony.frame.strings,
			frets: harmony.frame.frets,
			firstFret: harmony.frame.firstFret,
			notes: harmony.frame.frameNotes.map((frameNote) => [
				frameNote.string,
				frameNote.fret,
				frameNote.fingering,
				frameNote.barre,
			]),
		},
	};
}

// A Guitar Pro 6 style track: diagrams on the track, named but without <Chord>.
const gpif = `<GPIF><GPVersion>6</GPVersion>
<MasterTrack><Tracks>0</Tracks></MasterTrack>
<Tracks><Track id="0"><Name>Guitar</Name><Properties>
 <Property name="Tuning"><Pitches>40 45 50 55 59 64</Pitches></Property>
 <Property name="DiagramCollection"><Items>
  <Item id="0" name="F#m7/C#"><Diagram stringCount="6" fretCount="4" baseFret="0">
   <Fret string="1" fret="4"/><Fret string="2" fret="4"/><Fret string="3" fret="2"/><Fret string="4" fret="2"/><Fret string="5" fret="2"/>
   <Fingering><Position finger="Index" fret="2" string="3"/><Position finger="Index" fret="2" string="5"/><Position finger="Ring" fret="4" string="1"/><Position finger="Pinky" fret="4" string="2"/></Fingering>
  </Diagram></Item>
  <Item id="1" name="N.C."><Diagram stringCount="6" fretCount="4" baseFret="0"/></Item>
  <Item id="2" name="C7(b9)"><Diagram stringCount="6" fretCount="4" baseFret="0"><Property name="ShowDiagram" type="bool" value="false"/></Diagram>
   <Chord><KeyNote step="C" accidental="Natural"/><BassNote step="C" accidental="Natural"/>
    <Degree interval="Third" alteration="Major" omitted="false"/><Degree interval="Fifth" alteration="Perfect" omitted="true"/>
    <Degree interval="Seventh" alteration="Minor" omitted="false"/><Degree interval="Ninth" alteration="Minor" omitted="false"/></Chord></Item>
 </Items></Property>
</Properties></Track></Tracks>
<MasterBars><MasterBar><Time>4/4</Time><Bars>0</Bars></MasterBar></MasterBars>
<Bars><Bar id="0"><Clef>G2</Clef><Voices>0</Voices></Bar></Bars>
<Voices><Voice id="0"><Beats>0 1 2</Beats></Voice></Voices>
<Beats>
 <Beat id="0"><Rhythm ref="0"/><Chord>0</Chord></Beat>
 <Beat id="1"><Rhythm ref="0"/><Chord>2</Chord></Beat>
 <Beat id="2"><Rhythm ref="1"/><Chord>1</Chord></Beat>
</Beats>
<Notes/>
<Rhythms><Rhythm id="0"><NoteValue>Quarter</NoteValue></Rhythm><Rhythm id="1"><NoteValue>Half</NoteValue></Rhythm></Rhythms></GPIF>`;

async function archive(xml: string): Promise<Uint8Array> {
	const zip = new JSZip();
	zip.file("Content/score.gpif", xml);
	return zip.generateAsync({ type: "uint8array" });
}

describe("Guitar Pro chord diagrams", () => {
	it("imports diagrams as harmonies with root, kind and frame", async () => {
		const doc = await new GuitarProParser().parseFromBytes(
			fixture("chords.gp"),
			{ unsupported: "omit" },
		);
		const harmonies = doc.score.parts[0]!.measures.flatMap(
			(measure) => measure.harmonies,
		);
		expect(harmonies).toHaveLength(8);
		expect(summary(harmonies[0]!)).toEqual({
			root: { step: "C", alter: null, text: null },
			kind: "major",
			text: null,
			bass: null,
			degrees: [],
			printFrame: null,
			frame: {
				strings: 6,
				frets: 5,
				firstFret: null,
				// The low E is muted, so it has no dot.
				notes: [
					[5, 3, "3", null],
					[4, 2, "2", null],
					[3, 0, null, null],
					[2, 1, "1", null],
					[1, 0, null, null],
				],
			},
		});
		// Dm barred at the fifth fret: the window starts there and frets are absolute.
		expect(summary(harmonies[7]!)).toMatchObject({
			root: { step: "D" },
			kind: "minor",
			frame: {
				firstFret: 5,
				notes: [
					[5, 5, "1", "start"],
					[4, 7, "3", null],
					[3, 7, "4", null],
					[2, 6, "2", null],
					[1, 5, "1", "stop"],
				],
			},
		});
		// Each harmony sits over the beat that names it.
		expect(harmonies[0]!.nextNote?.pitch?.step).toBe("C");
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("reads track diagrams by name, degrees, hidden diagrams and unparseable names", async () => {
		const omitted: string[] = [];
		const doc = await new GuitarProParser().parseFromBytes(
			await archive(gpif),
			{
				unsupported: "omit",
				onUnsupported: (feature) => omitted.push(feature),
			},
		);
		const measure = doc.score.parts[0]!.measures[0]!;
		const [sharp, flatNine] = measure.harmonies.map(summary);
		expect(sharp).toMatchObject({
			root: { step: "F", alter: 1 },
			kind: "minor-seventh",
			bass: ["C", 1],
			frame: {
				notes: [
					[5, 4, "3", null],
					[4, 4, "4", null],
					[3, 2, "1", "start"],
					[2, 2, null, null],
					[1, 2, "1", "stop"],
				],
			},
		});
		expect(flatNine).toMatchObject({
			kind: "dominant",
			text: "7(b9)",
			degrees: [
				["subtract", 5, 0],
				["add", 9, -1],
			],
			frame: null,
		});
		expect(measure.harmonies.map((harmony) => harmony.measureBeat)).toEqual([
			0, 1,
		]);
		expect(omitted).toEqual(["chord diagrams without a chord root"]);
	});

	it("exports harmonies as diagrams that import back unchanged", async () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ name: "Guitar" }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef({ sign: "G", line: 2 });
		const voice = measure.getOrCreateVoice("1");
		const frame = {
			strings: 6,
			frets: 4,
			firstFret: 3,
			notes: [
				{ string: 5, fret: 3, fingering: "1", barre: "start" as const },
				{ string: 4, fret: 5, fingering: "3" },
				{ string: 3, fret: 5, fingering: "4" },
				{ string: 2, fret: 4, fingering: "2" },
				{ string: 1, fret: 3, barre: "stop" as const },
			],
		};
		measure.addHarmony({ root: { step: "C" }, kind: "dominant", frame });
		voice.addNote({ step: "C", octave: 4, type: "half" });
		measure.addHarmony({
			root: { step: "B", alter: -1 },
			kind: { value: "major-seventh", text: "Δ" },
			bass: { step: "D" },
			degrees: [{ value: 11, type: "add", alter: 1 }],
		});
		voice.addNote({ step: "D", octave: 4, type: "quarter" });
		measure.addHarmony({ root: { step: "C" }, kind: "dominant", frame });
		voice.addNote({ step: "E", octave: 4, type: "quarter" });
		const gp = await new GuitarProSerializer().serializeToBytes(doc);
		const gpifText = await (await JSZip.loadAsync(gp))
			.file("Content/score.gpif")!
			.async("string");
		// The repeated C7 shares one diagram.
		expect(gpifText.match(/<Item /g)).toHaveLength(2);
		expect(gpifText).toContain('name="BbΔ/D"');
		const back = await new GuitarProParser().parseFromBytes(gp);
		const harmonies = back.score.parts[0]!.measures[0]!.harmonies;
		const fingered = summary(measure.harmonies[0]!);
		// A barre's far end takes the finger of its start.
		fingered.frame!.notes[4]![2] = "1";
		expect(harmonies.map(summary)).toEqual([
			fingered,
			summary(measure.harmonies[1]!),
			fingered,
		]);
		expect(harmonies.map((harmony) => harmony.measureBeat)).toEqual([0, 2, 3]);
		expect(schemaErrors(back)).toEqual([]);
	});

	it("splits a held note at a chord symbol between beats into tied beats", async () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ name: "Guitar" }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure
			.getOrCreateVoice("1")
			.addNote({ step: "C", octave: 4, type: "whole" });
		measure.addHarmony({ root: { step: "C" }, kind: "major", onset: 0 });
		measure.addHarmony({ root: { step: "G" }, kind: "major", onset: 2.5 });
		const omitted: string[] = [];
		const gp = await new GuitarProSerializer().serializeToBytes(doc, {
			unsupported: "omit",
			onUnsupported: (feature) => omitted.push(feature),
		});
		expect(omitted).toEqual([]);
		const back = await new GuitarProParser().parseFromBytes(gp);
		const restored = back.score.parts[0]!.measures[0]!;
		expect(restored.harmonies.map((harmony) => harmony.measureBeat)).toEqual([
			0, 2.5,
		]);
		expect(
			restored.notes.map((note) => [note.measureBeat, note.beats]),
		).toEqual([
			[0, 2],
			[2, 0.5],
			[2.5, 1.5],
		]);
	});

	it("reports harmonies it cannot place on a beat", async () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ name: "Guitar" }).addMeasure();
		measure.setTime({ beats: 4, beatType: 4 });
		measure
			.getOrCreateVoice("1")
			.addNote({ step: "C", octave: 4, type: "whole" });
		measure.addHarmony({ root: { step: "G" }, kind: "major", onset: 0.3 });
		measure.addHarmony({ numeral: { root: 5 }, kind: "major", onset: 0 });
		expect(new GuitarProSerializer().serializeToBytes(doc)).rejects.toThrow(
			"chord symbols without a single letter root",
		);
		const omitted: string[] = [];
		await new GuitarProSerializer().serializeToBytes(doc, {
			unsupported: "omit",
			onUnsupported: (feature) => omitted.push(feature),
		});
		expect(omitted).toEqual([
			"chord symbols without a single letter root",
			"several chord symbols on one beat",
		]);
	});
});
