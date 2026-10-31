// vet-ignore-file compact-files: the rhythm edits share one duration model.
import type { Chord } from "./chord";
import { MElement } from "./m-element";
import { type MNode, required } from "./m-node";
import {
	type DurationSpec,
	durationDivisions,
	Note,
	type NoteSpec,
	type NoteType,
	type PitchSpec,
} from "./note";
import type { TimeModificationSpec } from "./time-modification";
import { onsetOf, repairTimelineAfter } from "./timeline";
import type { Voice } from "./voice";

export type RhythmBuild = (
	spec: DurationSpec,
	duration: number,
	pitch: PitchSpec | null,
	isChord: boolean,
) => Note;

interface Entry {
	chord: Chord;
	onset: number;
	duration: number;
	end: number;
}

interface Region {
	reference: MNode | null;
}

interface RestPlan {
	region: Region;
	start: number;
	end: number;
	divisions: number;
	timeModification?: TimeModificationSpec;
	specs: DurationSpec[];
	removals: Entry[];
}

const NOTE_TYPES: NoteType[] = [
	"whole",
	"half",
	"quarter",
	"eighth",
	"16th",
	"32nd",
	"64th",
	"128th",
];

export function replaceRest(
	voice: Voice,
	rest: Note,
	specOrPitches: NoteSpec | DurationSpec | PitchSpec[],
	chordSpec: DurationSpec | undefined,
	build: RhythmBuild,
): number {
	const entries = entriesIn(voice);
	const target = locate(voice, rest, entries);
	if (!target.chord.lead.isRest || target.chord.notes.length !== 1) {
		throw new Error("replaceRest target must be a single rest");
	}
	const divisions = noteDivisions(rest);
	const isChord = Array.isArray(specOrPitches);
	const spec = (isChord ? chordSpec : specOrPitches) as DurationSpec;
	if (!spec || (isChord && specOrPitches.length === 0)) {
		throw new Error("rest replacement needs a duration and at least one pitch");
	}
	const duration = durationDivisions(spec, divisions);
	if (duration <= 0 || duration > target.duration) {
		throw new Error("replacement duration must fit within the rest");
	}
	const replacementIsRest = !isChord && !("step" in specOrPitches);
	const plan = restPlan(voice, entries, {
		anchors: [target],
		removals: [target],
		start: target.onset + duration,
		end: target.end,
		timeModification: target.chord.lead.timeModification ?? undefined,
		mergeBefore: false,
		mergeAfter: true,
		divisions,
	});
	const replacements: Note[] = [];
	if (replacementIsRest) {
		replacements.push(build(spec, duration, null, false));
	} else {
		const pitches = isChord ? specOrPitches : [specOrPitches as NoteSpec];
		pitches.forEach((pitch, index) => {
			replacements.push(build(spec, duration, pitch, index > 0));
		});
	}
	applyRestPlan(voice, plan, build, replacements);
	return (target.onset + duration) / divisions;
}

export function resize(
	voice: Voice,
	target: Note | Chord,
	spec: { type: NoteType; dots?: number },
	build: RhythmBuild,
): void {
	const entries = entriesIn(voice);
	const entry = locate(voice, target, entries);
	if (entry.chord.lead.isRest || entry.chord.lead.isGrace) {
		throw new Error("resize target must be a timed note or chord");
	}
	const divisions = noteDivisions(entry.chord.lead);
	const timeModification = entry.chord.lead.timeModification ?? undefined;
	const after = durationDivisions({ ...spec, timeModification }, divisions);
	if (after <= 0) {
		throw new Error("resize duration must be positive");
	}
	if (after === entry.duration) {
		for (const note of entry.chord.notes) {
			writeDuration(note, spec, after);
		}
		return;
	}
	assertUnmarked(entry, "resize");
	const index = entries.indexOf(entry);
	const newEnd = entry.onset + after;
	if (after < entry.duration) {
		const plan = restPlan(voice, entries, {
			anchors: [entry],
			removals: [],
			start: newEnd,
			end: entry.end,
			timeModification,
			mergeBefore: false,
			mergeAfter: true,
			divisions,
		});
		for (const note of entry.chord.notes) {
			writeDuration(note, spec, after);
		}
		applyRestPlan(voice, plan, build);
		return;
	}

	const limit = measureLimit(voice, entry, entries);
	if (newEnd > limit) {
		throw new Error("resize cannot overrun the measure");
	}
	const overlapped = entries
		.slice(index + 1)
		.filter((candidate) => candidate.onset < newEnd);
	for (const candidate of overlapped) {
		assertUnmarked(candidate, "overwrite");
	}
	const previousVoiceEnd = entries.at(-1)?.end ?? entry.end;
	const partial = overlapped.at(-1);
	const remainder = partial ? partial.end - newEnd : 0;
	const removals = remainder > 0 ? overlapped.slice(0, -1) : overlapped;
	let partialSpec: { type: NoteType; dots?: number } | null = null;
	let plan: RestPlan | null = null;
	if (partial && remainder > 0) {
		if (partial.chord.lead.isRest) {
			removals.push(partial);
			plan = restPlan(voice, entries, {
				anchors: [entry, ...overlapped],
				removals,
				start: newEnd,
				end: partial.end,
				timeModification: partial.chord.lead.timeModification ?? undefined,
				mergeBefore: false,
				mergeAfter: true,
				divisions,
			});
		} else {
			partialSpec = durationSpec(
				remainder,
				divisions,
				partial.chord.lead.timeModification ?? undefined,
			);
			regionFor(voice, [entry, ...overlapped]);
		}
	} else {
		regionFor(voice, [entry, ...overlapped]);
	}
	for (const note of entry.chord.notes) {
		writeDuration(note, spec, after);
	}
	if (!plan) {
		for (const candidate of removals) {
			removeEntry(candidate);
		}
	}
	if (partialSpec && partial) {
		for (const note of partial.chord.notes) {
			writeDuration(note, partialSpec, remainder);
		}
	}
	if (plan) {
		applyRestPlan(voice, plan, build);
	}
	if (newEnd > previousVoiceEnd) {
		repairTimelineAfter(
			voice.measure,
			entry.chord.lead,
			newEnd - previousVoiceEnd,
		);
	}
}

export function removeRhythmEntry(
	voice: Voice,
	target: Note | Chord,
	build: RhythmBuild,
): void {
	const entries = entriesIn(voice);
	const entry = locate(voice, target, entries);
	assertUnmarked(entry, "remove");
	if (target instanceof Note && entry.chord.notes.length > 1) {
		const members = entry.chord.notes;
		const index = members.indexOf(target);
		if (index < 0) {
			throw new Error("removeEntry target must belong to the chord");
		}
		if (index === 0) {
			members[1]!.child("chord")?.remove();
		}
		target.remove();
		return;
	}
	const divisions = noteDivisions(entry.chord.lead);
	const plan = restPlan(voice, entries, {
		anchors: [entry],
		removals: [entry],
		start: entry.onset,
		end: entry.end,
		timeModification: entry.chord.lead.timeModification ?? undefined,
		mergeBefore: true,
		mergeAfter: true,
		divisions,
	});
	applyRestPlan(voice, plan, build);
}

function locate(voice: Voice, target: Note | Chord, entries: Entry[]): Entry {
	const lead = target instanceof Note ? target : target.lead;
	if (!lead || lead.parent !== voice.measure || lead.voice !== voice.id) {
		throw new Error("rhythm edit target must belong to this voice and measure");
	}
	const entry = entries.find((candidate) =>
		target instanceof Note
			? candidate.chord.notes.includes(target)
			: candidate.chord.lead === lead,
	);
	if (!entry || entry.chord.lead.isGrace || entry.duration <= 0) {
		throw new Error("rhythm edits require a timed, non-grace entry");
	}
	return entry;
}

function entriesIn(voice: Voice): Entry[] {
	const entries: Entry[] = [];
	for (const chord of voice.chords) {
		const lead = chord.lead;
		if (lead.isGrace) {
			continue;
		}
		const onset = onsetOf(voice.measure, lead);
		const duration = lead.duration;
		if (onset == null || duration == null) {
			continue;
		}
		entries.push({ chord, onset, duration, end: onset + duration });
	}
	return entries;
}

function noteDivisions(note: Note): number {
	return required(note.divisions, "divisions for rhythm edit");
}

function assertUnmarked(entry: Entry, action: string): void {
	for (const note of entry.chord.notes) {
		if (
			note.playbackTies.length > 0 ||
			note.ties.length > 0 ||
			note.beams.length > 0 ||
			note.tuplets.length > 0 ||
			note.slurs.length > 0
		) {
			throw new Error(
				`cannot ${action} an entry with ties, beams, tuplets, or slurs`,
			);
		}
	}
}

function restPlan(
	voice: Voice,
	entries: Entry[],
	options: {
		anchors: Entry[];
		removals: Entry[];
		start: number;
		end: number;
		timeModification?: TimeModificationSpec;
		mergeBefore: boolean;
		mergeAfter: boolean;
		divisions: number;
	},
): RestPlan {
	const removals = [...options.removals];
	let { start, end } = options;
	if (end < start) {
		throw new Error("rest gap cannot be negative");
	}
	const indexed = removals.length > 0 ? removals : options.anchors.slice(-1);
	const indexes = indexed.map((entry) => entries.indexOf(entry));
	let first = Math.min(...indexes);
	let last = Math.max(...indexes);
	if (options.mergeBefore) {
		while (first > 0) {
			const candidate = entries[first - 1]!;
			if (!isCompatibleRest(candidate, start, true, options.timeModification)) {
				break;
			}
			removals.unshift(candidate);
			start = candidate.onset;
			first--;
		}
	}
	if (options.mergeAfter) {
		let next = Math.max(last + 1, first);
		while (next < entries.length) {
			const candidate = entries[next]!;
			if (!isCompatibleRest(candidate, end, false, options.timeModification)) {
				break;
			}
			removals.push(candidate);
			end = candidate.end;
			last = next;
			next++;
		}
	}
	const uniqueRemovals = [...new Set(removals)];
	const specs = restSpecs(
		start,
		end,
		options.divisions,
		options.timeModification,
		metricGroups(voice, options.divisions),
	);
	return {
		region: regionFor(voice, [...options.anchors, ...uniqueRemovals]),
		start,
		end,
		divisions: options.divisions,
		timeModification: options.timeModification,
		specs,
		removals: uniqueRemovals,
	};
}

function isCompatibleRest(
	entry: Entry,
	boundary: number,
	before: boolean,
	timeModification?: TimeModificationSpec,
): boolean {
	return (
		entry.chord.notes.length === 1 &&
		entry.chord.lead.isRest &&
		(before ? entry.end : entry.onset) === boundary &&
		sameRatio(entry.chord.lead.timeModification, timeModification)
	);
}

function sameRatio(
	left: TimeModificationSpec | null,
	right?: TimeModificationSpec,
): boolean {
	return (
		(left == null && right == null) ||
		(left?.actual === right?.actual && left?.normal === right?.normal)
	);
}

function regionFor(voice: Voice, entries: Entry[]): Region {
	const children = voice.measure.children;
	const indexes = entries.flatMap((entry) =>
		entry.chord.notes.map((note) => children.indexOf(note)),
	);
	if (indexes.some((index) => index < 0)) {
		throw new Error("rhythm edit region is detached");
	}
	const first = Math.min(...indexes);
	const last = Math.max(...indexes);
	for (let index = first; index <= last; index++) {
		const node = children[index];
		if (
			node instanceof MElement &&
			(node.tag === "backup" || node.tag === "forward")
		) {
			throw new Error("rhythm edits cannot cross backup/forward movers");
		}
	}
	return { reference: children[last + 1] ?? null };
}

function applyRestPlan(
	voice: Voice,
	plan: RestPlan,
	build: RhythmBuild,
	replacements: Note[] = [],
): void {
	for (const entry of plan.removals) {
		removeEntry(entry);
	}
	let at = plan.start;
	for (const spec of plan.specs) {
		const duration = durationDivisions(spec, plan.divisions);
		replacements.push(build(spec, duration, null, false));
		at += duration;
	}
	if (at !== plan.end) {
		throw new Error("internal rest plan did not fill its gap");
	}
	for (const note of replacements) {
		voice.measure.insertBefore(note, plan.region.reference);
	}
}

function removeEntry(entry: Entry): void {
	for (const note of entry.chord.notes) {
		note.remove();
	}
}

function writeDuration(
	note: Note,
	spec: { type: NoteType; dots?: number },
	duration: number,
): void {
	const type = required(note.child("type"), "<type> on resized note");
	const durationNode = required(
		note.child("duration"),
		"<duration> on resized note",
	);
	type.setText(spec.type);
	for (const dot of note.childrenNamed("dot")) {
		dot.remove();
	}
	const afterType = note.children[note.children.indexOf(type) + 1] ?? null;
	for (let index = 0; index < (spec.dots ?? 0); index++) {
		note.insertBefore(new MElement("dot"), afterType);
	}
	durationNode.setText(String(duration));
}

function durationSpec(
	duration: number,
	divisions: number,
	timeModification?: TimeModificationSpec,
): DurationSpec {
	const candidate = durationCandidates(divisions, timeModification).find(
		(each) => each.duration === duration,
	);
	if (!candidate) {
		throw new Error(
			`cannot represent ${duration} divisions as one note duration`,
		);
	}
	return candidate.spec;
}

function restSpecs(
	start: number,
	end: number,
	divisions: number,
	timeModification: TimeModificationSpec | undefined,
	groups: Array<{ start: number; end: number }>,
): DurationSpec[] {
	const specs: DurationSpec[] = [];
	const candidates = durationCandidates(divisions, timeModification);
	let at = start;
	while (at < end) {
		const group = groups.find(
			(candidate) => at >= candidate.start && at < candidate.end,
		) ?? { start, end };
		const limit = Math.min(end, group.end);
		const best = candidates.find(
			(candidate) => candidate.duration <= limit - at,
		);
		if (!best) {
			throw new Error(
				`cannot represent rest gap of ${end - start} divisions at ${start}`,
			);
		}
		specs.push(best.spec);
		at += best.duration;
	}
	return specs;
}

function durationCandidates(
	divisions: number,
	timeModification?: TimeModificationSpec,
): Array<{ spec: DurationSpec; duration: number }> {
	const candidates: Array<{ spec: DurationSpec; duration: number }> = [];
	for (const type of NOTE_TYPES) {
		for (let dots = 0; dots <= 3; dots++) {
			const spec = { type, dots, timeModification };
			try {
				const duration = durationDivisions(spec, divisions);
				candidates.push({ spec, duration });
			} catch {
				// Fractional durations at these divisions are not candidates.
			}
		}
	}
	return candidates.sort((left, right) => right.duration - left.duration);
}

function metricGroups(
	voice: Voice,
	divisions: number,
): Array<{ start: number; end: number }> {
	const time = voice.measure.getTime(voice.staff);
	if (!time || time.isSenzaMisura) {
		return [];
	}
	const groups: Array<{ start: number; end: number }> = [];
	let at = 0;
	for (const component of time.components) {
		const beatType = Number(component.beatType);
		const unit = (divisions * 4) / beatType;
		if (!Number.isSafeInteger(unit) || unit <= 0) {
			return [];
		}
		for (const numerator of component.beats.split("+")) {
			const beats = Number(numerator);
			if (!Number.isSafeInteger(beats) || beats <= 0) {
				return [];
			}
			let groupSize = 1;
			if (beatType >= 8 && beats % 3 === 0) {
				groupSize = 3;
			} else if (beatType === 4 && (beats === 4 || beats === 2)) {
				groupSize = 2;
			}
			for (let beat = 0; beat < beats; beat += groupSize) {
				const duration = unit * Math.min(groupSize, beats - beat);
				groups.push({ start: at, end: at + duration });
				at += duration;
			}
		}
	}
	return groups;
}

function measureLimit(voice: Voice, target: Entry, entries: Entry[]): number {
	const voiceEnd = entries.at(-1)?.end ?? target.end;
	const groups = metricGroups(voice, noteDivisions(target.chord.lead));
	const barEnd = groups.at(-1)?.end;
	if (barEnd == null) {
		return voiceEnd;
	}
	return voice.measure.isImplicit ? Math.min(voiceEnd, barEnd) : barEnd;
}
