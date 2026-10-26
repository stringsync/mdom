// SPDX-License-Identifier: MPL-2.0
// GPIF field interpretation adapted from alphaTab's GpifParser and GpifWriter. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import type { GuitarProValues } from './guitar-pro-values';
import { GuitarProXml as X } from './guitar-pro-xml';
import { MElement } from './m-node';
import type { Measure } from './measure';
import type { FermataShape, Note } from './note';
import type { Ottava } from './octave-shift';
import type { Part } from './part';

/** GPIF fermata types and the MusicXML shapes that print them. */
const FERMATAS: Record<string, FermataShape> = {
	Short: 'angled',
	Medium: 'normal',
	Long: 'square',
};

/** GPIF tremolo picking speeds and their tremolo slash counts. */
const TREMOLOS: Record<string, number> = { '1/2': 1, '1/4': 2, '1/8': 3 };

const OTTAVAS: readonly Ottava[] = ['8va', '8vb', '15ma', '15mb'];

/**
 * A Guitar Pro stroke names the picking hand's motion: a down stroke strikes the
 * low string first, so the chord rolls up in pitch, and MusicXML's arpeggiate
 * direction names the pitch.
 */
const ROLLS: Record<string, 'up' | 'down'> = { Down: 'up', Up: 'down' };

interface OttavaRun {
	ottava: Ottava;
	first: Note;
	last: Note;
}

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
			beat.child('Ottavia')?.text ?? null,
			lead,
			notes.at(-1)!,
			voice,
		);
		if (lead.isRest) {
			return;
		}
		const tremolo = beat.child('Tremolo')?.text;
		if (tremolo) {
			const marks = TREMOLOS[tremolo];
			if (marks == null) {
				this.values.unsupported(`tremolo picking ${tremolo}`);
			} else {
				lead.setTremolo(marks);
			}
		}
		const stroke =
			X.property(beat, 'Brush')?.child('Direction')?.text ??
			beat.child('Arpeggio')?.text;
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
		const pick = X.property(beat, 'PickStroke')?.child('Direction')?.text;
		if (pick === 'Up' || pick === 'Down') {
			lead.setBowing(pick === 'Up' ? 'up' : 'down');
		} else if (pick && pick !== 'None') {
			this.values.unsupported(`pick stroke ${pick}`);
		}
		if (X.property(beat, 'Tapped')) {
			lead.setTap({ hand: 'right' });
		}
	}

	/** Put the MasterBar's fermatas on the beats of `measure` at their offsets. */
	readFermatas(master: MElement, measure: Measure): void {
		for (const fermata of master.child('Fermatas')?.childrenNamed('Fermata') ??
			[]) {
			const type = fermata.child('Type')?.text ?? 'Medium';
			const shape = FERMATAS[type];
			const [numerator, denominator = '1'] = (
				fermata.child('Offset')?.text ?? '0/1'
			).split('/');
			const offset = Number(numerator) / Number(denominator);
			const notes = measure.notes.filter(
				(note) => !note.isGrace && note.measureBeat === offset,
			);
			if (!shape) {
				this.values.unsupported(`fermata ${type}`);
			} else if (!Number.isFinite(offset) || !notes.length) {
				this.values.unsupported('fermatas between beats');
			}
			if (!shape || !notes.length) {
				continue;
			}
			for (const note of notes) {
				if (!note.isChordMember) {
					note.setFermata('upright', shape);
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

interface OttavaSpan {
	ottava: Ottava;
	from: number;
	to: number;
}

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
						shift.octaveShiftType !== 'up' &&
						shift.octaveShiftType !== 'down'
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
			X.add(beat, 'Ottavia', ottava.ottava);
		}
		const tremolos = notes.flatMap((note) =>
			note.ornaments.filter((ornament) => ornament.tag === 'tremolo'),
		);
		if (tremolos.length) {
			const marks = tremolos[0]!.tremoloMarks;
			const speed = Object.keys(TREMOLOS).find(
				(key) => TREMOLOS[key] === marks,
			);
			if (!speed) {
				this.values.unsupported(`tremolo of ${marks} marks`);
			} else {
				X.add(beat, 'Tremolo', speed);
			}
		}
		const roll = notes.find((note) => note.arpeggiate)?.arpeggiate;
		if (roll) {
			X.addProperty(
				beat,
				'Brush',
				'Direction',
				roll.direction === 'down' ? 'Up' : 'Down',
			);
		}
		const bowing = notes.find((note) => note.bowing)?.bowing;
		if (bowing) {
			X.addProperty(
				beat,
				'PickStroke',
				'Direction',
				bowing === 'up' ? 'Up' : 'Down',
			);
		}
		const tap = notes.find((note) => note.tap)?.tap;
		if (tap?.hand === 'left') {
			this.values.unsupported('left-hand tapping');
		} else if (tap) {
			X.add(
				beat.child('Properties') ?? X.add(beat, 'Properties'),
				'Property',
				undefined,
				{ name: 'Tapped' },
			).append(new MElement('Enable'));
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
		const fermatas = master.child('Fermatas') ?? X.add(master, 'Fermatas');
		if (
			fermatas
				.childrenNamed('Fermata')
				.some((node) => node.child('Offset')?.text === offset)
		) {
			return;
		}
		const node = X.add(fermatas, 'Fermata');
		X.add(node, 'Type', type);
		X.add(node, 'Offset', offset);
		X.add(node, 'Length', 0);
	}
}

/** A point in a part as one comparable number: measure index, then beat. */
function position(measure: number, beat: number | null): number {
	return measure * 1_000_000 + (beat ?? 0);
}

/** `beats` as a reduced GPIF `numerator/denominator` of quarter notes. */
function fraction(beats: number, divisions: number): string {
	let numerator = Math.round(beats * divisions);
	let denominator = divisions;
	let a = numerator;
	let b = denominator;
	while (b) {
		[a, b] = [b, a % b];
	}
	if (a > 1) {
		numerator /= a;
		denominator /= a;
	}
	return `${numerator}/${denominator}`;
}
