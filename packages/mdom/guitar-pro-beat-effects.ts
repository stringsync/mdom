// SPDX-License-Identifier: MPL-2.0
// GPIF field interpretation adapted from alphaTab's GpifParser and GpifWriter. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import { FERMATAS, OTTAVAS, TREMOLOS } from "./guitar-pro-beat-effect-tables";
import type { GuitarProValues } from "./guitar-pro-values";
import { GuitarProXml as X } from "./guitar-pro-xml";
import type { MElement } from "./m-element";
import type { Measure } from "./measure";
import type { Note } from "./note";
import type { Ottava } from "./octave-shift";

/**
 * Reads GPIF beat effects onto the notes they mark: tremolo picking, brushes
 * and arpeggios, pick strokes, tapping and beat ottavas, plus the MasterBar's
 * fermatas. One per track, since an ottava runs on across bars.
 */
export class GuitarProBeatEffectReader {
	private readonly runs = new Map<string, OttavaRun>();
	constructor(private readonly values: GuitarProValues) {}

	/** Mark one beat's `notes`, its chord with the lead first, in `voice`. */
	read(beat: MElement, notes: Note[], voice: string): void {
		const lead = notes[0]!;
		this.ottava(
			beat.child("Ottavia")?.text ?? null,
			lead,
			notes.at(-1)!,
			voice,
		);
		if (lead.isRest) {
			return;
		}
		const tremolo = beat.child("Tremolo")?.text;
		if (tremolo) {
			const marks = TREMOLOS[tremolo];
			if (marks == null) {
				this.values.unsupported(`tremolo picking ${tremolo}`);
			} else {
				lead.setTremolo(marks);
			}
		}
		const stroke =
			X.property(beat, "Brush")?.child("Direction")?.text ??
			beat.child("Arpeggio")?.text;
		if (stroke) {
			const direction = ROLLS[stroke];
			if (!direction) {
				this.values.unsupported(`brush ${stroke}`);
			} else {
				for (const note of notes) {
					note.setArpeggiate({ direction });
				}
			}
		}
		const pick = X.property(beat, "PickStroke")?.child("Direction")?.text;
		if (pick === "Up" || pick === "Down") {
			lead.setBowing(pick === "Up" ? "up" : "down");
		} else if (pick && pick !== "None") {
			this.values.unsupported(`pick stroke ${pick}`);
		}
		if (X.property(beat, "Tapped")) {
			lead.setTap({ hand: "right" });
		}
	}

	/** Put the MasterBar's fermatas on the beats of `measure` at their offsets. */
	readFermatas(master: MElement, measure: Measure): void {
		for (const fermata of master.child("Fermatas")?.childrenNamed("Fermata") ??
			[]) {
			const type = fermata.child("Type")?.text ?? "Medium";
			const shape = FERMATAS[type];
			const [numerator, denominator = "1"] = (
				fermata.child("Offset")?.text ?? "0/1"
			).split("/");
			const offset = Number(numerator) / Number(denominator);
			const notes = measure.notes.filter(
				(note) => !note.isGrace && note.measureBeat === offset,
			);
			if (!shape) {
				this.values.unsupported(`fermata ${type}`);
			} else if (!Number.isFinite(offset) || !notes.length) {
				this.values.unsupported("fermatas between beats");
			}
			if (!shape || !notes.length) {
				continue;
			}
			for (const note of notes) {
				if (!note.isChordMember) {
					note.setFermata("upright", shape);
				}
			}
		}
	}

	/** Close every ottava still running at the end of the track. */
	finish(): void {
		for (const voice of [...this.runs.keys()]) {
			this.close(voice);
		}
	}

	private ottava(
		text: string | null,
		first: Note,
		last: Note,
		voice: string,
	): void {
		const ottava = OTTAVAS.find((name) => name === text) ?? null;
		if (text && !ottava) {
			this.values.unsupported(`ottava ${text}`);
		}
		const run = this.runs.get(voice);
		if (run && run.ottava === ottava) {
			run.last = last;
			return;
		}
		this.close(voice);
		if (ottava) {
			this.runs.set(voice, { ottava, first, last });
		}
	}

	private close(voice: string): void {
		const run = this.runs.get(voice);
		if (run) {
			run.first.addOctaveShift(run.last, run.ottava);
			this.runs.delete(voice);
		}
	}
}

/**
 * A Guitar Pro stroke names the picking hand's motion: a down stroke strikes the
 * low string first, so the chord rolls up in pitch, and MusicXML's arpeggiate
 * direction names the pitch.
 */
const ROLLS: Record<string, "up" | "down"> = { Down: "up", Up: "down" };

interface OttavaRun {
	ottava: Ottava;
	first: Note;
	last: Note;
}
