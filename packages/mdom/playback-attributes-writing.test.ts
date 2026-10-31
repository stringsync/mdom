import { describe, expect, it } from "bun:test";
import { MDocument } from "./index";
import { schemaErrors } from "./music-xml-schema";

describe("playback attributes, writing", () => {
	const build = () => {
		const doc = MDocument.empty();
		const measure = doc.score
			.addPart({ id: "P1", name: "Violin" })
			.addMeasure();
		const voice = measure.getOrCreateVoice("1");
		const first = voice.addNote({ step: "C", octave: 4, type: "half" });
		const second = voice.addNote({ step: "C", octave: 4, type: "half" });
		return { doc, measure, first, second };
	};

	it("ties for print and playback together, and unties both", () => {
		const { doc, first, second } = build();
		first.addTie(second);
		expect(first.playbackTies).toEqual(["start"]);
		expect(second.playbackTies).toEqual(["stop"]);
		expect(schemaErrors(doc)).toEqual([]);

		first.removeTie(second);
		expect(first.playbackTies).toEqual([]);
		expect(second.playbackTies).toEqual([]);
		expect(first.ties).toEqual([]);
	});

	it("keeps a middle note tied both ways, stop first, until each tie goes", () => {
		const { doc, measure, first, second } = build();
		const third = measure
			.getOrCreateVoice("1")
			.addNote({ step: "C", octave: 4, type: "half" });
		second.addTie(third);
		first.addTie(second);
		expect(second.playbackTies).toEqual(["stop", "start"]);
		expect(schemaErrors(doc)).toEqual([]);

		first.removeTie(second);
		expect(second.playbackTies).toEqual(["start"]);
		expect(third.playbackTies).toEqual(["stop"]);
	});

	it("writes a playback tie with no printed one", () => {
		const { doc, first } = build();
		first.setPlaybackTie("start", true);
		first.setPlaybackTie("start", true);
		expect(first.playbackTies).toEqual(["start"]);
		expect(first.ties).toEqual([]);
		expect(schemaErrors(doc)).toEqual([]);
		first.setPlaybackTie("start", false);
		expect(first.playbackTies).toEqual([]);
	});

	it("writes and clears note performance", () => {
		const { doc, first } = build();
		first.setPerformance({
			dynamics: 70,
			endDynamics: 40,
			attack: 0.25,
			release: -0.5,
			pizzicato: false,
		});
		expect(first.performance).toEqual({
			dynamics: 70,
			endDynamics: 40,
			attack: 0.25,
			release: -0.5,
			pizzicato: false,
		});
		expect(schemaErrors(doc)).toEqual([]);
		first.setPerformance({ dynamics: 90 });
		expect(first.performance.dynamics).toBe(90);
		expect(first.performance.pizzicato).toBeNull();
		first.setPerformance(null);
		expect(first.getAttribute("dynamics")).toBeNull();
	});

	it("writes a directive and an offset direction in schema order", () => {
		const { doc, measure } = build();
		const direction = measure.addDirection({
			words: "Allegro",
			directive: true,
			tempo: 132,
			staff: "1",
			offset: { beats: 1, sound: true },
			sound: { dynamics: 80, pizzicato: true },
		});
		expect(direction.isDirective).toBe(true);
		expect(direction.offset?.beats).toBe(1);
		expect(direction.offset?.sound).toBe(true);
		expect(direction.playbackBeat).toBe(5);
		expect(direction.sound!.dynamics).toBe(80);
		expect(direction.sound!.pizzicato).toBe(true);
		expect(
			direction.children.flatMap((child) =>
				"tag" in child ? [child.tag] : [],
			),
		).toEqual(["direction-type", "offset", "staff", "sound"]);
		expect(schemaErrors(doc)).toEqual([]);

		direction.setOffset(null);
		direction.setDirective(null);
		expect(direction.offset).toBeNull();
		expect(direction.isDirective).toBe(false);
	});
});
