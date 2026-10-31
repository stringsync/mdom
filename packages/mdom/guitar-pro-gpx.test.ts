import { describe, expect, it } from "bun:test";
import { GuitarProParser, MusicXMLSerializer } from "./index";

const fixture = (name: string) =>
	Bun.file(new URL(`./fixtures/guitar-pro/${name}`, import.meta.url))
		.arrayBuffer()
		.then((buffer) => new Uint8Array(buffer));

const musicXml = async (name: string, opts = {}) =>
	new MusicXMLSerializer().serializeToString(
		await new GuitarProParser().parseFromBytes(await fixture(name), opts),
	);

describe("Guitar Pro 6 .gpx import", () => {
	// alphaTab's guitarpro6 corpus holds the same scores as its guitarpro7 corpus.
	it("reads key-signatures.gpx as the same score as key-signatures.gp", async () => {
		expect(await musicXml("key-signatures.gpx")).toBe(
			await musicXml("key-signatures.gp"),
		);
	});

	it("reads repeat-close.gpx as the same score as repeat-close.gp", async () => {
		expect(await musicXml("repeat-close.gpx")).toBe(
			await musicXml("repeat-close.gp"),
		);
	});

	it("reads score-info.gpx as the same score as score-info.gp", async () => {
		expect(await musicXml("score-info.gpx")).toBe(
			await musicXml("score-info.gp"),
		);
	});

	it("reads strings.gpx as the same score as strings.gp", async () => {
		expect(await musicXml("strings.gpx")).toBe(await musicXml("strings.gp"));
	});

	it("reads time-signatures.gpx as the same score as time-signatures.gp", async () => {
		expect(await musicXml("time-signatures.gpx")).toBe(
			await musicXml("time-signatures.gp"),
		);
	});

	it("reads tuplets.gpx as the same score as tuplets.gp", async () => {
		expect(await musicXml("tuplets.gpx")).toBe(await musicXml("tuplets.gp"));
	});

	it("reads notes.gpx", async () => {
		const xml = await musicXml("notes.gpx");
		expect(xml).toContain("<score-partwise");
		expect(xml).toContain("<note");
	});

	it("reads the grace-note slide in grace.gpx", async () => {
		const xml = await musicXml("grace.gpx");
		expect(xml).toContain("<grace");
		expect(xml).toContain('<slide type="start"');
	});

	it("throws once a container inflates past maxUncompressedBytes", async () => {
		expect(
			new GuitarProParser().parseFromBytes(await fixture("notes.gpx"), {
				maxUncompressedBytes: 1024,
			}),
		).rejects.toThrow("maxUncompressedBytes");
	});

	it("rejects a container with no score.gpif", async () => {
		const bytes = new Uint8Array(0x2000);
		bytes.set(new TextEncoder().encode("BCFS"));
		expect(new GuitarProParser().parseFromBytes(bytes)).rejects.toThrow(
			"score.gpif",
		);
	});
});
