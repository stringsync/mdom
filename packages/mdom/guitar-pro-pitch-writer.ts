import { groupChords } from './chord';
import { GuitarProValues } from './guitar-pro-values';
import type { Note } from './note';
import type { Part } from './part';

/** Allocates GP8's internal playback strings without changing the mdom notes. */
export class GuitarProPitchWriter {
	readonly tuning = [40, 45, 50, 55, 59, 64];
	readonly strings = new Map<Note, number>();
	constructor(part: Part, staff: string) {
		const heldByVoice = new Map<string, Set<number>>();
		for (const measure of part.measures) {
			const notes = measure.notes.filter((n) => n.staff === staff);
			for (const voice of new Set(notes.map((n) => n.voice))) {
				const held = heldByVoice.get(voice) ?? new Set<number>();
				heldByVoice.set(voice, held);
				for (const chord of groupChords(
					notes.filter((n) => n.voice === voice),
				)) {
					const used = new Set(held);
					for (const note of chord.notes) {
						const origin = note.ties.find((t) => t.tieType === 'stop')?.partner
							?.note;
						const string = origin && this.strings.get(origin);
						if (string != null) {
							this.strings.set(note, string);
							used.add(string);
						}
					}
					for (const note of chord.notes) {
						if (!note.pitch) {
							continue;
						}
						let string = this.strings.get(note);
						if (string == null) {
							string = 0;
							while (used.has(string)) {
								string++;
							}
							this.strings.set(note, string);
							used.add(string);
						}
						const midi = GuitarProValues.midi(note.pitch);
						this.tuning[string] = Math.min(this.tuning[string] ?? midi, midi);
						if (
							note.ties.some(
								(t) => t.tieType === 'start' || t.tieType === 'continue',
							)
						) {
							held.add(string);
						} else {
							held.delete(string);
						}
					}
				}
			}
		}
	}
}
