import { describe, expect, it } from "bun:test";
import { MDOMParser } from "./index";

describe("sound automation, reading", () => {
	const parse = (xml: string) => new MDOMParser().parseFromString(xml);

	// Measure 1: a mid-score program change as Finale writes it (a <direction>'s
	// <sound> holding only a <midi-instrument>), then a standalone sound with the
	// deprecated pan/elevation, every pedal spelling and a segno's divisions.
	const AUTOMATION = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Strings</part-name>
    <score-instrument id="P1-I1"><instrument-name>Strings</instrument-name></score-instrument>
    <midi-instrument id="P1-I1"><midi-program>49</midi-program></midi-instrument>
  </score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <direction placement="above">
        <direction-type><words>pizz.</words></direction-type>
        <sound>
          <midi-device id="P1-I1" port="2">Synth</midi-device>
          <midi-instrument id="P1-I1"><midi-program>46</midi-program><volume>80</volume></midi-instrument>
        </sound>
      </direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration></note>
      <sound pan="-45" elevation="10" damper-pedal="yes" soft-pedal="40" sostenuto-pedal="no" segno="A" divisions="4"/>
    </measure>
    <measure number="2">
      <sound damper-pedal="maybe" pan="270"/>
    </measure>
  </part>
</score-partwise>`;

	const part = parse(AUTOMATION).score.getPart("P1")!;
	const [first, second] = part.measures;
	const [change, pedals] = first!.sounds;

	it("reads a mid-score midi-instrument and midi-device change", () => {
		expect(change!.midiInstruments).toEqual([
			{
				id: "P1-I1",
				channel: null,
				name: null,
				bank: null,
				program: 46,
				unpitched: null,
				volume: 80,
				pan: null,
				elevation: null,
			},
		]);
		expect(change!.midiDevices).toEqual([
			{ id: "P1-I1", port: 2, name: "Synth" },
		]);
		expect(pedals!.midiInstruments).toEqual([]);
		expect(part.midiInstruments[0]!.program).toBe(49); // the part's own is untouched
	});

	it("reads pan, elevation and divisions, null when unset", () => {
		expect(pedals!.pan).toBe(-45);
		expect(pedals!.elevation).toBe(10);
		expect(pedals!.divisions).toBe(4);
		expect(change!.pan).toBeNull();
		expect(change!.divisions).toBeNull();
	});

	it("reads pedals as percent depressed: yes 100, no 0, numbers as given", () => {
		expect(pedals!.damperPedal).toBe(100);
		expect(pedals!.softPedal).toBe(40);
		expect(pedals!.sostenutoPedal).toBe(0);
		expect(change!.damperPedal).toBeNull();
	});

	it("reads invalid pedal and out-of-range pan values as null", () => {
		expect(second!.sounds[0]!.damperPedal).toBeNull();
		expect(second!.sounds[0]!.pan).toBeNull();
	});
});
