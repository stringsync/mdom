import { descendants, MElement } from "./m-element";
import type { Part } from "./part";
import { cloneElement } from "./registry";
import type { Score } from "./score";

/** Where {@link Score.importPart} puts the copy. */
export interface ImportPartOptions {
	/** Put the copy after this part (or the part with this id); last by default. */
	after?: Part | string;
}

/**
 * Copy `source` (from any document) into `score` as a new part, leaving the
 * source untouched. See {@link Score.importPart}.
 */
export function importPart(
	score: Score,
	source: Part,
	opts?: ImportPartOptions,
): Part {
	const anchor = anchorOf(score, opts?.after);
	const measureCount = score.parts[0]?.measures.length;
	if (measureCount !== undefined && source.measures.length !== measureCount) {
		throw new Error(
			`mdom: cannot import part "${source.id}": it has ${source.measures.length} measures but the score has ${measureCount}`,
		);
	}

	const copy = cloneElement(source) as Part;
	const entry = scorePartEntry(source);
	const scorePart = entry ? cloneElement(entry) : new MElement("score-part");

	const id = freeId(score, source.id);
	copy.setAttribute("id", id);
	scorePart.setAttribute("id", id);
	remapInstruments(score, copy, scorePart);
	rescaleDivisions(copy, destinationDivisions(score));

	// Parts follow the part-list, so a new last part goes after the last one.
	const parts = score.parts;
	const lastPart = parts[parts.length - 1];
	const nextPart = anchor ? (parts[parts.indexOf(anchor) + 1] ?? null) : null;
	if (anchor && nextPart) {
		score.insertBefore(copy, nextPart);
	} else if (lastPart) {
		score.insertBefore(copy, siblingAfter(score, lastPart));
	} else {
		score.append(copy);
	}

	let partList = score.child("part-list");
	if (!partList) {
		partList = new MElement("part-list");
		score.insertBefore(partList, score.childrenNamed("part")[0] ?? null);
	}
	const entries = partList.childrenNamed("score-part");
	const anchorEntry = anchor
		? entries.find((entry) => entry.getAttribute("id") === anchor.id)
		: entries[entries.length - 1];
	partList.insertBefore(
		scorePart,
		anchorEntry ? siblingAfter(partList, anchorEntry) : null,
	);
	return copy;
}

function anchorOf(score: Score, after: Part | string | undefined): Part | null {
	if (after === undefined) {
		return null;
	}
	const id = typeof after === "string" ? after : after.id;
	const found = score.getPart(id);
	if (!found || (typeof after !== "string" && found !== after)) {
		throw new Error(`mdom: cannot import part: no part "${id}" in the score`);
	}
	return found;
}

function siblingAfter(parent: MElement, child: MElement) {
	const siblings = parent.children;
	return siblings[siblings.indexOf(child) + 1] ?? null;
}

function scorePartEntry(part: Part): MElement | null {
	return (
		part.score
			.child("part-list")
			?.childrenNamed("score-part")
			.find((entry) => entry.getAttribute("id") === part.id) ?? null
	);
}

/** Every `id` on an element that is an XML ID (not an IDREF back to one). */
const REFERENCE_TAGS = new Set([
	"part",
	"instrument",
	"midi-instrument",
	"midi-device",
]);

function usedIds(score: Score): Set<string> {
	const ids = new Set<string>();
	for (const node of descendants(score)) {
		if (node instanceof MElement) {
			const id = node.getAttribute("id");
			if (id !== null) {
				ids.add(id);
			}
		}
	}
	return ids;
}

function freeId(score: Score, wanted: string): string {
	const used = usedIds(score);
	if (!used.has(wanted)) {
		return wanted;
	}
	let index = score.parts.length + 1;
	while (used.has(`P${index}`)) {
		index++;
	}
	return `P${index}`;
}

/** Give instruments whose ids the score already uses new ids, in both places. */
function remapInstruments(score: Score, part: Part, scorePart: MElement) {
	const used = usedIds(score);
	const renamed = new Map<string, string>();
	for (const instrument of scorePart.childrenNamed("score-instrument")) {
		const old = instrument.getAttribute("id");
		if (old === null || !used.has(old)) {
			continue;
		}
		let index = 1;
		while (used.has(`${part.id}-I${index}`)) {
			index++;
		}
		const next = `${part.id}-I${index}`;
		used.add(next);
		renamed.set(old, next);
		instrument.setAttribute("id", next);
	}
	if (renamed.size === 0) {
		return;
	}
	const refs = [
		...scorePart.childrenNamed("midi-instrument"),
		...scorePart.childrenNamed("midi-device"),
	];
	for (const node of descendants(part)) {
		if (node instanceof MElement && node.tag === "instrument") {
			refs.push(node);
		}
	}
	for (const ref of refs) {
		const next = renamed.get(ref.getAttribute("id") ?? "");
		if (next !== undefined && REFERENCE_TAGS.has(ref.tag)) {
			ref.setAttribute("id", next);
		}
	}
}

/** The `<divisions>` the score's existing parts declare first, or null. */
function destinationDivisions(score: Score): number | null {
	for (const part of score.parts) {
		for (const node of descendants(part)) {
			if (node instanceof MElement && node.tag === "divisions") {
				const value = Number(node.text);
				if (value > 0) {
					return value;
				}
			}
		}
	}
	return null;
}

/**
 * Express every duration of `part` in `target` divisions per quarter. Nothing
 * changes when the part already uses it or the score declares none.
 */
function rescaleDivisions(part: Part, target: number | null) {
	if (target === null) {
		return;
	}
	let current: number | null = null;
	for (const node of descendants(part)) {
		if (!(node instanceof MElement)) {
			continue;
		}
		if (node.tag === "divisions") {
			current = Number(node.text);
			node.setText(String(target));
		} else if (node.tag === "duration" || node.tag === "offset") {
			const value = Number(node.text);
			if (current === null || current === target || !Number.isFinite(value)) {
				continue;
			}
			const scaled = (value * target) / current;
			if (!Number.isInteger(scaled)) {
				throw new Error(
					`mdom: cannot import part "${part.id}": a <${node.tag}> of ${value} at ${current} divisions is not a whole number at ${target}`,
				);
			}
			node.setText(String(scaled));
		}
	}
}
