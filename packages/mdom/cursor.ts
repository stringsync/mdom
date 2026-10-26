import { required } from './m-node';
import { Measure } from './measure';
import { Note } from './note';
import { measureIndexIn, measuresOf, Part } from './part';
import { memo } from './read-cache';
import type { Voice } from './voice';

/**
 * An immutable timeline caret: a position `(measure, voice, onset-in-beats)` in a
 * score. Movement returns a NEW cursor — the original keeps pointing where it
 * did, so two carets can be held at once (a selection's start and end, a slur's
 * two endpoints). The position is a coordinate, not a node reference: {@link note}
 * is looked up live from the tree on each access, so an edit elsewhere never
 * stales the cursor, and it's null when the caret sits on a gap or past the
 * voice's last note (the append point).
 *
 * Selecting non-notes (a measure to set its width, a slur to reshape it) isn't a
 * caret move: the cursor only locates the object via {@link measure}/{@link note}
 * and the edit happens on that node directly (`cursor.measure.width = …`).
 */
export class Cursor {
	constructor(
		readonly measure: Measure,
		readonly voiceId: string,
		readonly staff: string,
		/** Onset within the measure, in quarter-note beats. */
		readonly onset: number,
	) {}

	/** A caret on a specific note (its measure, voice, and onset). */
	static at(note: Note): Cursor;
	/** A caret at `beat` within a voice (default the voice start). */
	static at(voice: Voice, beat?: number): Cursor;
	static at(target: Note | Voice, beat = 0): Cursor {
		if (target instanceof Note) {
			const measure = required(
				target.closest(Measure),
				'<measure> ancestor for cursor',
			);
			const onset = required(target.measureBeat, 'measureBeat for cursor');
			return new Cursor(measure, target.voice, target.staff, onset);
		}
		return new Cursor(target.measure, target.id, target.staff, beat);
	}

	/** The voice this caret sits in (reader + writer). */
	get voice(): Voice {
		return this.measure.getOrCreateVoice(this.voiceId, { staff: this.staff });
	}

	/**
	 * The note starting at this onset in this voice (the lead note of a chord), or
	 * null on a gap or past the last note. Recomputed from the tree each access.
	 */
	get note(): Note | null {
		// ponytail: exact beat match. A hand-passed fractional onset (e.g. a triplet
		// via voice.cursor(1/3)) must equal measureBeat() bit-for-bit; epsilon-compare
		// if that bites. Cursors from next()/prev()/note.cursor() store the note's own
		// measureBeat(), so they always match.
		return this.stopsIn(this.measure).byOnset.get(this.onset) ?? null;
	}

	/**
	 * The caret on the next note in this voice, crossing into the next measure's
	 * same voice when at the end; null past the last note of the part.
	 */
	next(): Cursor | null {
		const stops = this.stopsIn(this.measure);
		const later = firstAbove(stops.reachedBy, this.onset);
		if (later < stops.notes.length) {
			return Cursor.at(stops.notes[later]!);
		}
		for (const measure of this.measuresFrom(1)) {
			const first = this.stopsIn(measure).notes[0];
			if (first) {
				return Cursor.at(first);
			}
		}
		return null;
	}

	/**
	 * The caret on the previous note in this voice, crossing into the previous
	 * measure's same voice; null before the first note of the part.
	 */
	prev(): Cursor | null {
		const stops = this.stopsIn(this.measure);
		const earlier = firstAbove(stops.lowestFrom, this.onset, true) - 1;
		if (earlier >= 0) {
			return Cursor.at(stops.notes[earlier]!);
		}
		for (const measure of this.measuresFrom(-1)) {
			const { notes } = this.stopsIn(measure);
			if (notes.length > 0) {
				return Cursor.at(notes[notes.length - 1]!);
			}
		}
		return null;
	}

	/** The lead notes (chord heads) of this voice in `measure`, indexed by onset. */
	private stopsIn(measure: Measure): Stops {
		return memo(measure, `cursor-stops:${this.voiceId}`, () =>
			indexStops(
				measure
					.getOrCreateVoice(this.voiceId, { staff: this.staff })
					.chords.map((chord) => chord.notes[0]!),
			),
		);
	}

	/** This part's measures stepping out from the current one: +1 forward, -1 back (nearest first). */
	private *measuresFrom(step: 1 | -1): Generator<Measure> {
		const part = this.measure.closest(Part);
		if (!part) {
			return;
		}
		const measures = measuresOf(part);
		const index = measureIndexIn(part, this.measure);
		for (
			let at = index + step;
			index >= 0 && at >= 0 && at < measures.length;
			at += step
		) {
			yield measures[at]!;
		}
	}
}

/**
 * A voice's stops in one measure, in document order, with the onset indexes
 * that answer {@link Cursor.note}, `next` and `prev` without scanning: onsets need
 * not rise in document order (a grace note shares its main note's onset), so
 * `reachedBy[i]` is the highest onset among stops `0..i` and `lowestFrom[i]` the
 * lowest among stops `i..`, both non-decreasing and so binary-searchable.
 */
interface Stops {
	notes: readonly Note[];
	byOnset: ReadonlyMap<number, Note>;
	reachedBy: readonly number[];
	lowestFrom: readonly number[];
}

function indexStops(notes: readonly Note[]): Stops {
	const byOnset = new Map<number, Note>();
	const onsets = notes.map((note) => {
		const onset = note.measureBeat;
		if (onset != null && !byOnset.has(onset)) {
			byOnset.set(onset, note);
		}
		return onset ?? 0;
	});
	const reachedBy: number[] = [];
	onsets.forEach((onset, index) => {
		reachedBy.push(
			index === 0 ? onset : Math.max(reachedBy[index - 1]!, onset),
		);
	});
	const lowestFrom: number[] = new Array(onsets.length);
	for (let index = onsets.length - 1; index >= 0; index--) {
		const after = lowestFrom[index + 1];
		lowestFrom[index] =
			after == null ? onsets[index]! : Math.min(after, onsets[index]!);
	}
	return { notes, byOnset, reachedBy, lowestFrom };
}

/**
 * The first index into non-decreasing `values` whose value exceeds `onset`, or
 * reaches it when `inclusive`; `values.length` when none does.
 */
function firstAbove(
	values: readonly number[],
	onset: number,
	inclusive = false,
): number {
	let low = 0;
	let high = values.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		const value = values[middle]!;
		if (inclusive ? value < onset : value <= onset) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
}
