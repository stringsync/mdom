import {
	MDOMParser,
	MDocument,
	MElement,
	MusicXMLSerializer,
	Note,
} from "@stringsync/mdom";
import { descendants } from "../mdom/m-element";

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

export function serialize(element: MElement): string {
	return new MusicXMLSerializer().serializeToString(new MDocument(element));
}
