import type { model } from '@coderline/alphatab';

/** Encodes notation-only pitches for Guitar Pro's playback engine. */
export class GuitarProPitchWriter {
	write(score: model.Score): void {
		for (const track of score.tracks) {
			for (const staff of track.staves) {
				if (!staff.showTablature) {
					this.writeStaff(staff);
				}
			}
		}
	}

	private writeStaff(staff: model.Staff): void {
		// GP8 requires string/fret values even for piano. Allocate them only after
		// alphaTab has connected the original notation's ties by pitch.
		const pitches = new Map<model.Note, number>();
		for (const bar of staff.bars) {
			for (const voice of bar.voices) {
				for (const beat of voice.beats) {
					for (const note of beat.notes) {
						pitches.set(note, note.realValue);
					}
				}
			}
		}
		const tuning = [40, 45, 50, 55, 59, 64];
		const heldByVoice = new Map<number, Set<number>>();
		for (const bar of staff.bars) {
			for (const voice of bar.voices) {
				const held = heldByVoice.get(voice.index) ?? new Set<number>();
				heldByVoice.set(voice.index, held);
				for (const beat of voice.beats) {
					const used = new Set(held);
					for (const note of beat.notes) {
						if (note.tieOrigin) {
							note.string = note.tieOrigin.string;
							used.add(note.string);
						}
					}
					for (const note of beat.notes) {
						if (!note.tieOrigin) {
							let string = 1;
							while (used.has(string)) {
								string++;
							}
							note.string = string;
							used.add(string);
						}
						const pitch = pitches.get(note)!;
						tuning[note.string - 1] = Math.min(
							tuning[note.string - 1] ?? pitch,
							pitch,
						);
						if (note.tieDestination) {
							held.add(note.string);
						} else {
							held.delete(note.string);
						}
					}
				}
			}
		}
		staff.capo = 0;
		staff.stringTuning.tunings = tuning.toReversed();
		for (const [note, pitch] of pitches) {
			note.fret = pitch - tuning[note.string - 1]!;
		}
	}
}
