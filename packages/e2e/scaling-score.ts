import {
	MDOMParser,
	MDocument,
	MElement,
	MusicXMLSerializer,
	Note,
} from "@stringsync/mdom";
import { descendants } from "../mdom/m-element";
import { cloneElement } from "../mdom/registry";

export type Axis = "measures" | "parts" | "voices" | "notes";
export interface ScoreShape {
	measures: number;
	parts: number;
	voices: number;
	notes: number;
}

// Each copied block is self-contained. Keep complete spans, remove only markers
// whose counterpart was outside the seed/truncated block. A tie's identity also
// includes pitch, voice and staff; slur and direction numbers are part-local.
export function closeSpanners(measures: MElement[]): void {
	const open = new Map<string, MElement[]>();
	for (const measure of measures) {
		for (const node of descendants(measure)) {
			if (!(node instanceof MElement)) {
				continue;
			}
			const type = node.getAttribute("type");
			if (
				![
					"slur",
					"tie",
					"tied",
					"wedge",
					"octave-shift",
					"pedal",
					"dashes",
					"bracket",
					"wavy-line",
					"tuplet",
				].includes(node.tag)
			) {
				continue;
			}
			const note = node.closest(Note);
			const tieIdentity =
				node.tag === "tie" || node.tag === "tied"
					? `${note?.voice}:${note?.staff}:${note?.pitch?.step}:${note?.pitch?.alter}:${note?.pitch?.octave}`
					: "";
			const key = `${node.tag}:${node.getAttribute("number") ?? "1"}:${tieIdentity}`;
			const stack = open.get(key) ?? [];
			open.set(key, stack);
			const starts = [
				"start",
				"crescendo",
				"diminuendo",
				"up",
				"down",
			].includes(type ?? "");
			if (starts) {
				stack.push(node);
			} else if (type === "stop") {
				if (!stack.pop()) {
					node.remove();
				}
			} else if (type === "continue" || type === "change") {
				// Continuation markers add no endpoints and cannot stand alone.
				node.remove();
			}
		}
	}
	for (const stack of open.values()) {
		for (const marker of stack) {
			marker.remove();
		}
	}
}

/** Repeat complete real measures; reset attributes on each seed cycle. */
export function repeatScore(
	seed: MDocument,
	measureCount: number,
	partCount = seed.score.parts.length,
): string {
	const seedParts = seed.score.parts;
	if (!seedParts.length || seedParts.some((part) => !part.measures.length)) {
		throw new Error("Seed must contain parts with measures");
	}
	const partList: string[] = [];
	const parts: string[] = [];
	for (let partIndex = 0; partIndex < partCount; partIndex++) {
		const sourcePart = seedParts[partIndex % seedParts.length]!;
		const suffix = `-bench-${partIndex + 1}`;
		const sourceMetadata = seed.root
			.child("part-list")
			?.childrenNamed("score-part")
			.find((entry) => entry.getAttribute("id") === sourcePart.id);
		if (!sourceMetadata) {
			throw new Error(`Missing score-part for ${sourcePart.id}`);
		}
		const copiedMetadata = cloneElement(sourceMetadata);
		for (const node of descendants(copiedMetadata)) {
			if (node instanceof MElement && node.getAttribute("id")) {
				node.setAttribute("id", node.getAttribute("id")! + suffix);
			}
		}
		partList.push(serialize(copiedMetadata));
		const blocks: string[] = [];
		const sourceMeasures = sourcePart.measures;
		for (
			let blockStart = 0;
			blockStart < measureCount;
			blockStart += sourceMeasures.length
		) {
			const block = sourceMeasures
				.slice(0, Math.min(sourceMeasures.length, measureCount - blockStart))
				.map((measure) => cloneElement(measure));
			closeSpanners(block);
			for (const [measureIndex, measure] of block.entries()) {
				measure.setAttribute("number", String(blockStart + measureIndex + 1));
				for (const node of descendants(measure)) {
					if (node instanceof MElement && node.getAttribute("id")) {
						if (node.tag === "instrument") {
							node.setAttribute("id", node.getAttribute("id")! + suffix);
						} else {
							node.removeAttribute("id");
						}
					}
				}
				blocks.push(serialize(measure));
			}
		}
		parts.push(
			`<part id="${copiedMetadata.getAttribute("id")}">${blocks.join("\n")}</part>`,
		);
	}
	return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>${partList.join("\n")}</part-list>${parts.join("\n")}</score-partwise>`;
}

/** Controlled independent axes, with pitch taken from the real seed. */
export function syntheticScore(seed: MDocument, shape: ScoreShape): string {
	const seedNote = seed.score.parts
		.flatMap((part) => part.measures.flatMap((measure) => measure.notes))
		.find((note) => note.pitch);
	const pitch = seedNote?.pitch;
	const pitchXml = `<pitch><step>${pitch?.step ?? "C"}</step><octave>${pitch?.octave ?? 4}</octave></pitch>`;
	const partList: string[] = [];
	const parts: string[] = [];
	for (let partIndex = 1; partIndex <= shape.parts; partIndex++) {
		partList.push(
			`<score-part id="P${partIndex}"><part-name>Bench ${partIndex}</part-name></score-part>`,
		);
		const measures: string[] = [];
		for (let measureIndex = 1; measureIndex <= shape.measures; measureIndex++) {
			const attributes =
				measureIndex === 1
					? `<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>${shape.notes}</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef><transpose><diatonic>0</diatonic><chromatic>0</chromatic></transpose></attributes>`
					: "";
			const voices: string[] = [];
			for (let voiceIndex = 1; voiceIndex <= shape.voices; voiceIndex++) {
				const notes: string[] = [];
				for (let noteIndex = 0; noteIndex < shape.notes; noteIndex++) {
					const spanType = noteIndex === 0 ? "start" : "stop";
					const paired =
						shape.notes > 1 &&
						(noteIndex === 0 || noteIndex === shape.notes - 1);
					const tieType = noteIndex === 0 ? "start" : "stop";
					const ties =
						shape.notes > 1 && noteIndex < 2 ? `<tie type="${tieType}"/>` : "";
					const tied =
						shape.notes > 1 && noteIndex < 2 ? `<tied type="${tieType}"/>` : "";
					const slur =
						paired && voiceIndex === 1
							? `<slur number="1" type="${spanType}"/>`
							: "";
					const notations =
						tied || slur ? `<notations>${tied}${slur}</notations>` : "";
					notes.push(
						`<note>${pitchXml}<duration>1</duration>${ties}<voice>${voiceIndex}</voice><type>quarter</type>${notations}</note>`,
					);
				}
				voices.push(
					`${voiceIndex > 1 ? `<backup><duration>${shape.notes}</duration></backup>` : ""}${notes.join("")}`,
				);
			}
			const wedgeStart =
				'<direction><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>';
			const wedgeStop =
				'<direction><direction-type><wedge type="stop" number="1"/></direction-type></direction>';
			measures.push(
				`<measure number="${measureIndex}">${attributes}${wedgeStart}${voices.join("")}${wedgeStop}</measure>`,
			);
		}
		parts.push(`<part id="P${partIndex}">${measures.join("")}</part>`);
	}
	return `<score-partwise version="4.0"><part-list>${partList.join("")}</part-list>${parts.join("")}</score-partwise>`;
}

export function scoreCounts(
	xml: string,
): ScoreShape & { totalMeasures: number; totalNotes: number } {
	const document = new MDOMParser().parseFromString(xml);
	const parts = document.score.parts;
	const measures = parts.flatMap((part) => [...part.measures]);
	return {
		measures: parts.reduce(
			(maximum, part) => Math.max(maximum, part.measures.length),
			0,
		),
		parts: parts.length,
		voices: measures.reduce(
			(maximum, measure) =>
				Math.max(
					maximum,
					new Set(measure.notes.map((note) => note.voice)).size,
				),
			0,
		),
		notes: measures.reduce(
			(maximum, measure) => Math.max(maximum, measure.notes.length),
			0,
		),
		totalMeasures: measures.length,
		totalNotes: measures.reduce(
			(total, measure) => total + measure.notes.length,
			0,
		),
	};
}

function serialize(element: MElement): string {
	return new MusicXMLSerializer().serializeToString(new MDocument(element));
}
