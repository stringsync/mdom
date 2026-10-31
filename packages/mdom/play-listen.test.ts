import { describe, expect, it } from "bun:test";
import { MDOMParser, MDocument, type MElement } from "./index";
import { schemaErrors } from "./music-xml-schema";

const SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Brass</part-name>
    <score-instrument id="P1-I1"><instrument-name>Trumpet</instrument-name></score-instrument>
  </score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <direction><direction-type><words>mute</words></direction-type>
        <sound>
          <instrument-change id="P1-I1"><instrument-sound>brass.trumpet.piccolo</instrument-sound><solo/></instrument-change>
          <midi-instrument id="P1-I1"><midi-program>57</midi-program></midi-instrument>
          <play id="P1-I1"><mute>straight</mute><other-play type="x">y</other-play></play>
        </sound>
      </direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
        <play><ipa>la</ipa><semi-pitched>high</semi-pitched></play>
        <listen><assess type="no" player="p1" time-only="1,3"/><wait/><other-listen type="t">z</other-listen></listen>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe("play, listen and instrument-change", () => {
	it("reads them", () => {
		const measure = new MDOMParser().parseFromString(SCORE).score.getPart("P1")!
			.measures[0]!;
		const sound = measure.sounds[0]!;
		expect(sound.instrumentChanges).toEqual([
			{
				id: "P1-I1",
				sound: "brass.trumpet.piccolo",
				solo: true,
				ensemble: null,
				virtualInstrument: null,
			},
		]);
		expect(sound.plays).toEqual([
			{
				id: "P1-I1",
				ipa: null,
				mute: "straight",
				semiPitched: null,
				other: [{ type: "x", text: "y" }],
			},
		]);
		const note = measure.notes[0]!;
		expect(note.play).toEqual({
			id: null,
			ipa: "la",
			mute: null,
			semiPitched: "high",
			other: [],
		});
		expect(note.listen!.actions).toEqual([
			{ kind: "assess", assess: false, player: "p1", timeOnly: [1, 3] },
			{ kind: "wait", player: null, timeOnly: null },
			{ kind: "other", type: "t", text: "z", player: null, timeOnly: null },
		]);
	});

	it("writes a sound grouped by instrument, in schema order", () => {
		const doc = MDocument.empty();
		const part = doc.score.addPart({ id: "P1", name: "Brass" });
		part.addInstrument({ id: "P1-I1", name: "Trumpet" });
		const measure = part.addMeasure();
		const sound = measure.addDirection({
			words: "mute",
			sound: {
				plays: [{ id: "P1-I1", mute: "cup" }],
				midiInstruments: [{ id: "P1-I1", program: 57 }],
				instrumentChanges: [
					{ id: "P1-I1", sound: "brass.trumpet", solo: true },
				],
			},
		}).sound!;
		expect(sound.children.map((child) => (child as MElement).tag)).toEqual([
			"instrument-change",
			"midi-instrument",
			"play",
		]);
		expect(sound.instrumentChanges[0]!.solo).toBe(true);
		expect(sound.plays[0]!.mute).toBe("cup");
		expect(schemaErrors(doc)).toEqual([]);
	});

	it("writes and removes note play and listen, in order", () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ id: "P1", name: "X" }).addMeasure();
		measure.setDivisions(4);
		const note = measure
			.getOrCreateVoice("1")
			.addNote({ step: "C", octave: 4, type: "quarter" });
		note.setListen({ actions: [{ kind: "wait", player: "p1" }] });
		note.setPlay({ mute: "on", ipa: "ah" });
		expect(
			note.children.slice(-2).map((child) => (child as MElement).tag),
		).toEqual(["play", "listen"]);
		expect(note.play!.mute).toBe("on");
		expect(note.listen!.actions[0]).toMatchObject({
			kind: "wait",
			player: "p1",
		});
		expect(schemaErrors(doc)).toEqual([]);
		note.setPlay(null);
		note.setListen(null);
		expect(note.play).toBeNull();
		expect(note.listen).toBeNull();
		expect(() => note.setPlay({ mute: "bogus" as never })).toThrow("mute");
	});
});
