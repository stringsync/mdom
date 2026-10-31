// SPDX-License-Identifier: MPL-2.0
// GPIF field interpretation adapted from alphaTab's GpifParser and GpifWriter. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import { FERMATAS, OTTAVAS, TREMOLOS } from "./guitar-pro-beat-effect-tables";
import type { GuitarProValues } from "./guitar-pro-values";
import { GuitarProXml as X } from "./guitar-pro-xml";
import { MElement } from "./m-element";
import type { Note } from "./note";
import type { Ottava } from "./octave-shift";
import type { Part } from "./part";

/**
 * Writes the marks {@link GuitarProBeatEffectReader} reads back to GPIF beats
 * and MasterBars.
 */
export class GuitarProBeatEffectWriter {
	constructor(private readonly values: GuitarProValues) {}

	/** The ottava spans on `staff` of `part`, as measure-index-scaled positions. */
	ottavas(part: Part, staff: string): OttavaSpan[] {
		const spans: OttavaSpan[] = [];
		for (const measure of part.measures) {
			for (const direction of measure.directions) {
				if (direction.staff !== staff) {
					continue;
				}
				for (const shift of direction.octaveShifts) {
					if (
						shift.octaveShiftType !== "up" &&
						shift.octaveShiftType !== "down"
					) {
						continue;
					}
					const ottava = shift.ottava;
					if (!ottava || !OTTAVAS.includes(ottava)) {
						this.values.unsupported(`ottava ${ottava ?? shift.size}`);
						continue;
					}
					const end = shift.partner;
					spans.push({
						ottava,
						from: position(measure.index, shift.measureBeat),
						to: end
							? position(end.measure.index, end.measureBeat)
							: Number.POSITIVE_INFINITY,
					});
				}
			}
		}
		return spans;
	}

	/** Write the effects on `notes`, one beat's chord with the lead first. */
	write(beat: MElement, notes: Note[], ottavas: OttavaSpan[]): void {
		const lead = notes[0]!;
		const at = position(lead.measure.index, lead.measureBeat);
		const ottava = ottavas.find((span) => span.from <= at && at < span.to);
		if (ottava) {
			X.add(beat, "Ottavia", ottava.ottava);
		}
		const tremolos = notes.flatMap((note) =>
			note.ornaments.filter((ornament) => ornament.tag === "tremolo"),
		);
		if (tremolos.length) {
			const marks = tremolos[0]!.tremoloMarks;
			const speed = Object.keys(TREMOLOS).find(
				(key) => TREMOLOS[key] === marks,
			);
			if (!speed) {
				this.values.unsupported(`tremolo of ${marks} marks`);
			} else {
				X.add(beat, "Tremolo", speed);
			}
		}
		const roll = notes.find((note) => note.arpeggiate)?.arpeggiate;
		if (roll) {
			X.addProperty(
				beat,
				"Brush",
				"Direction",
				roll.direction === "down" ? "Up" : "Down",
			);
		}
		const bowing = notes.find((note) => note.bowing)?.bowing;
		if (bowing) {
			X.addProperty(
				beat,
				"PickStroke",
				"Direction",
				bowing === "up" ? "Up" : "Down",
			);
		}
		const tap = notes.find((note) => note.tap)?.tap;
		if (tap?.hand === "left") {
			this.values.unsupported("left-hand tapping");
		} else if (tap) {
			X.add(
				beat.child("Properties") ?? X.add(beat, "Properties"),
				"Property",
				undefined,
				{ name: "Tapped" },
			).append(new MElement("Enable"));
		}
	}

	/** Add the fermata on `notes`, one beat's chord, if any, to `master`'s Fermatas. */
	writeFermata(master: MElement, notes: Note[]): void {
		const lead = notes[0]!;
		const fermata = notes.map((note) => note.fermataShape).find(Boolean);
		if (!fermata || lead.isGrace) {
			return;
		}
		const type = Object.keys(FERMATAS).find((key) => FERMATAS[key] === fermata);
		if (!type) {
			this.values.unsupported(`fermata shape ${fermata}`);
			return;
		}
		const offset = fraction(lead.measureBeat ?? 0, lead.divisions ?? 1);
		const fermatas = master.child("Fermatas") ?? X.add(master, "Fermatas");
		if (
			fermatas
				.childrenNamed("Fermata")
				.some((node) => node.child("Offset")?.text === offset)
		) {
			return;
		}
		const node = X.add(fermatas, "Fermata");
		X.add(node, "Type", type);
		X.add(node, "Offset", offset);
		X.add(node, "Length", 0);
	}
}

interface OttavaSpan {
	ottava: Ottava;
	from: number;
	to: number;
}

/** A point in a part as one comparable number: measure index, then beat. */
function position(measure: number, beat: number | null): number {
	return measure * 1_000_000 + (beat ?? 0);
}

/** `beats` as a reduced GPIF `numerator/denominator` of quarter notes. */
function fraction(beats: number, divisions: number): string {
	let numerator = Math.round(beats * divisions);
	let denominator = divisions;
	let first = numerator;
	let second = denominator;
	while (second) {
		[first, second] = [second, first % second];
	}
	if (first > 1) {
		numerator /= first;
		denominator /= first;
	}
	return `${numerator}/${denominator}`;
}
