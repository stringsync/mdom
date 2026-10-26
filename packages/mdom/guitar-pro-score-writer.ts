// SPDX-License-Identifier: MPL-2.0
// GPIF field encoding adapted from alphaTab's GpifWriter. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import { groupChords } from './chord';
import { Direction } from './direction';
import { GuitarProBeatEffectWriter } from './guitar-pro-beat-effects';
import { writeDiagram } from './guitar-pro-diagrams';
import { GuitarProLyrics } from './guitar-pro-lyrics';
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProPitchWriter } from './guitar-pro-pitch-writer';
import {
	GuitarProPlayback,
	type GuitarProTransposition,
} from './guitar-pro-playback';
import { GuitarProValues } from './guitar-pro-values';
import { GuitarProXml as X } from './guitar-pro-xml';
import type { Harmony } from './harmony';
import { MDocument } from './m-document';
import { MElement } from './m-node';
import type { Measure } from './measure';
import type { Note } from './note';
import type { Part } from './part';
import { divisionsBackFrom } from './signature';
import { onsetOf } from './timeline';

/** One beat of a chord split at a harmony: where it starts and, when split, its note value. */
interface BeatPiece {
	onset: number;
	type?: string;
	dots?: number;
	size?: number;
}

/** The longest ordinary note value, dotted up to three times, that fits in `beats`. */
function noteValueWithin(
	beats: number,
): { type: string; dots: number; size: number } | null {
	for (const [type, duration] of Object.entries(GuitarProValues.durations)) {
		for (let dots = 3; dots >= 0; dots--) {
			const size = GuitarProValues.beats(duration, { dots });
			if (size <= beats + 1e-8) {
				return { type, dots, size };
			}
		}
	}
	return null;
}

/** A tempo automation at a fraction of its bar; linear ramps to the next one. */
interface TempoChange {
	position: number;
	tempo: number;
	linear: boolean;
}

/** Words that mark a gradual tempo change, like accel. or rit. */
const GRADUAL_TEMPO = /^(accel|rit|rall|ritard|allarg)/i;

/** The GPIF jump suffix ("AlFine", "AlDoubleCoda", "AlCoda") a D.C. or D.S.'s words spell, or none. */
function jumpUntil(words: string): string {
	const until = /al\s+(fine|double\s+coda|coda)/i.exec(words)?.[1];
	return until ? JUMP_UNTIL[until.toLowerCase().replace(/\s+/, ' ')]! : '';
}
const JUMP_UNTIL: Record<string, string> = {
	fine: 'AlFine',
	'double coda': 'AlDoubleCoda',
	coda: 'AlCoda',
};

interface StaffContext {
	id: string;
	tuning: number[];
	capo: number;
	pitches: GuitarProPitchWriter;
	/** Semitones from written to sounding pitch, from the part's `<transpose>`. */
	shift: number;
}

/** Writes GPIF tables directly from mdom notes; no external score model. */
export class GuitarProScoreWriter {
	private readonly values: GuitarProValues;
	private readonly root = new MElement('GPIF');
	private readonly effects: GuitarProBeatEffectWriter;
	private readonly tables = new Map<string, MElement>();
	/** Segno and coda ids by the GPIF target each was given, two of each. */
	private readonly landmarks = {
		segno: new Map<string, string>(),
		coda: new Map<string, string>(),
	};
	constructor(opts: GuitarProOptions = {}) {
		this.values = new GuitarProValues(opts);
		this.effects = new GuitarProBeatEffectWriter(this.values);
	}

	write(document: MDocument): MDocument {
		const parts = document.score.parts;
		const first = parts[0];
		if (!first || first.measures.length === 0) {
			throw new Error(
				'Guitar Pro export requires at least one part with measures',
			);
		}
		this.checkAnnotations(document.score);
		X.add(this.root, 'GPVersion', '7');
		X.add(this.root, 'GPRevision', '12025');
		X.add(X.add(this.root, 'Encoding'), 'EncodingDescription', 'GP7');
		const score = X.add(this.root, 'Score');
		X.add(score, 'Title', document.score.title ?? '');
		const identification = document.score.child('identification');
		for (const [tag, type] of [
			['Music', 'composer'],
			['Words', 'lyricist'],
			['Artist', 'artist'],
		]) {
			X.add(
				score,
				tag!,
				identification
					?.childrenNamed('creator')
					.find((c) => c.getAttribute('type') === type)?.text ?? '',
			);
		}
		X.add(score, 'Copyright', identification?.child('rights')?.text ?? '');
		for (const tag of [
			'SubTitle',
			'Album',
			'WordsAndMusic',
			'Tabber',
			'Instructions',
			'Notices',
			'FirstPageHeader',
			'FirstPageFooter',
			'PageHeader',
			'PageFooter',
		]) {
			X.add(score, tag, '');
		}
		X.add(score, 'ScoreSystemsDefaultLayout', 3);
		X.add(score, 'ScoreSystemsLayout', 3);
		const masterTrack = X.add(this.root, 'MasterTrack');
		const masterTracks = X.add(masterTrack, 'Tracks');
		if (first.measures[0]!.isImplicit) {
			X.add(masterTrack, 'Anacrusis');
		}
		const tempos = X.add(masterTrack, 'Automations');
		for (const name of [
			'Tracks',
			'MasterBars',
			'Bars',
			'Voices',
			'Beats',
			'Notes',
			'Rhythms',
		]) {
			this.tables.set(name, X.add(this.root, name));
		}
		const passes = this.endingPasses(first);
		for (const measure of first.measures) {
			const master = this.masterBar(measure);
			this.tables.get('MasterBars')!.append(master);
			if (passes[measure.index]!.length) {
				X.add(master, 'AlternateEndings', passes[measure.index]!.join(' '));
			}
			this.navigation(master, measure);
			X.add(master, 'Bars', '');
			for (const change of this.tempos(measure)) {
				this.automation(
					tempos,
					'Tempo',
					measure.index,
					`${change.tempo} 2`,
					change.position,
					change.linear,
				);
			}
		}
		for (const [index, part] of parts.entries()) {
			if (part.measures.length !== first.measures.length) {
				throw new Error(
					'Guitar Pro parts must have the same number of measures',
				);
			}
			const staffCount = part.measures[0]!.staveCount;
			if (!Number.isInteger(staffCount) || staffCount < 1) {
				throw new Error(`Invalid staff count: ${staffCount}`);
			}
			const staffIds = Array.from({ length: staffCount }, (_, i) =>
				String(i + 1),
			);
			for (const measure of part.measures) {
				if (measure.notes.some((n) => !staffIds.includes(n.staff))) {
					throw new Error('Guitar Pro notes must refer to a declared staff');
				}
				if (measure.staveCount !== staffCount) {
					throw new Error(
						'Guitar Pro export does not support changing the staff count',
					);
				}
				const master = first.measures[measure.index]!;
				const own = this.masterBar(measure);
				const shared = this.masterBar(master);
				for (const tag of ['Time', 'Repeat', 'DoubleBar']) {
					if (
						own.child(tag)?.text !== shared.child(tag)?.text ||
						JSON.stringify(own.child(tag)?.attributes) !==
							JSON.stringify(shared.child(tag)?.attributes) ||
						measure.isImplicit !== master.isImplicit
					) {
						throw new Error(
							'Guitar Pro requires matching meter, pickups and repeats across parts',
						);
					}
				}
				if (
					index > 0 &&
					this.tempos(measure).length &&
					JSON.stringify(this.tempos(measure)) !==
						JSON.stringify(this.tempos(master))
				) {
					throw new Error(
						'Guitar Pro requires matching tempo changes across parts',
					);
				}
				for (const attributes of measure.childrenNamed('attributes').slice(1)) {
					if (attributes.child('key') || attributes.child('time')) {
						this.values.unsupported('mid-measure key or time changes');
					}
				}
			}
			const transposition = this.transposition(part);
			// A Guitar Pro track holds at most a grand staff, so a part with more staves splits into consecutive tracks of up to two.
			for (let firstStaff = 1; firstStaff <= staffCount; firstStaff += 2) {
				const track = this.entry('Tracks', 'Track');
				X.add(track, 'Name', part.label ?? '');
				X.add(track, 'ShortName', part.label ?? '');
				X.add(track, 'Color', '200 40 40');
				X.add(track, 'SystemsDefautLayout', 3);
				X.add(track, 'SystemsLayout', 3);
				const scorePart = document.score
					.child('part-list')
					?.childrenNamed('score-part')
					.find((s) => s.getAttribute('id') === part.id);
				const instrument = scorePart?.child('midi-instrument');
				const program =
					GuitarProValues.integer(
						Number(instrument?.child('midi-program')?.text ?? 1),
						'MIDI program',
						1,
						128,
					) - 1;
				const channel =
					GuitarProValues.integer(
						Number(instrument?.child('midi-channel')?.text ?? 1),
						'MIDI channel',
						1,
						16,
					) - 1;
				new GuitarProPlayback().write(track, program, channel, transposition);
				const staves = X.add(track, 'Staves');
				for (
					let staff = firstStaff;
					staff <= Math.min(firstStaff + 1, staffCount);
					staff++
				) {
					this.writeStaff(part, staves, String(staff), transposition.shift);
				}
				if (firstStaff === 1) {
					GuitarProLyrics.write(track, part);
				}
			}
		}
		masterTracks.setText(
			this.tables
				.get('Tracks')!
				.childrenNamed('Track')
				.map((track) => track.getAttribute('id'))
				.join(' '),
		);
		return new MDocument(this.root, { version: '1.0', encoding: 'utf-8' });
	}

	private entry(table: string, tag: string): MElement {
		const parent = this.tables.get(table)!;
		return X.add(parent, tag, undefined, {
			id: String(parent.children.length),
		});
	}
	private automation(
		parent: MElement,
		type: string,
		bar: number,
		value: string,
		position = 0,
		linear = false,
	): void {
		const node = X.add(parent, 'Automation');
		for (const [tag, text] of Object.entries({
			Type: type,
			Linear: String(linear),
			Bar: String(bar),
			Position: String(position),
			Visible: 'true',
			Value: value,
		})) {
			X.add(node, tag, text);
		}
	}
	private masterBar(measure: Measure): MElement {
		const time = measure.getTime();
		if (time && (time.components.length !== 1 || time.isSenzaMisura)) {
			throw new Error('Guitar Pro export requires a simple time signature');
		}
		const numerator = GuitarProValues.integer(
			Number(time?.beats ?? 4),
			'time numerator',
			1,
			64,
		);
		const denominator = GuitarProValues.integer(
			Number(time?.beatType ?? 4),
			'time denominator',
			1,
			128,
		);
		if ((denominator & (denominator - 1)) !== 0) {
			throw new Error('Guitar Pro time denominator must be a power of two');
		}
		const node = new MElement('MasterBar');
		this.key(node, measure, '1');
		X.add(node, 'Time', `${numerator}/${denominator}`);
		if (measure.isImplicit && measure.index > 0) {
			this.values.unsupported('pickups after the first measure');
		}
		const start = measure.barlines.some((b) => b.repeat === 'forward');
		const end = measure.barlines.find((b) => b.repeat === 'backward');
		if (start || end) {
			const repeat = X.add(node, 'Repeat', undefined, {
				start: String(start),
				end: String(!!end),
			});
			if (end) {
				repeat.setAttribute(
					'count',
					String(
						GuitarProValues.integer(
							end.repeatTimes ?? 2,
							'repeat count',
							2,
							100,
						),
					),
				);
			}
		}
		if (measure.barlines.some((b) => b.barStyle === 'light-light')) {
			X.add(node, 'DoubleBar');
		}
		return node;
	}
	/**
	 * The passes each measure's volta plays on, from the brackets' `start`
	 * edges to their `stop`/`discontinue` ones; empty outside a volta.
	 */
	private endingPasses(part: Part): number[][] {
		let open: number[] = [];
		return part.measures.map((measure) => {
			const endings = measure.barlines.flatMap((barline) =>
				barline.ending ? [barline.ending] : [],
			);
			const start = endings.find((ending) => ending.type === 'start');
			if (start) {
				open = start.numbers;
				if (!open.length) {
					this.values.unsupported('endings with no pass numbers');
				} else if (open.some((pass) => pass > 32)) {
					this.values.unsupported('endings past pass 32');
					open = [];
				}
			}
			const passes = open;
			if (endings.some((ending) => ending.type !== 'start')) {
				open = [];
			}
			return passes;
		});
	}
	/**
	 * A measure's segno, coda, fine and jump marks as GPIF `Directions`, read
	 * from their `<sound>` attributes (and a printed segno or coda with none).
	 * Guitar Pro has two of each landmark: ids `segno-segno` and `double-coda`
	 * claim the second, any other id the first one free.
	 */
	private navigation(master: MElement, measure: Measure): void {
		const targets: string[] = [];
		const jumps: string[] = [];
		const add = (list: string[], name: string | null) => {
			if (name && !list.includes(name)) {
				list.push(name);
			}
		};
		for (const sound of measure.sounds) {
			const words =
				sound.parent instanceof Direction ? sound.parent.words.join(' ') : '';
			if (sound.segno != null) {
				add(targets, this.landmark('segno', sound.segno));
			}
			if (sound.coda != null) {
				add(targets, this.landmark('coda', sound.coda));
			}
			if (sound.fine != null) {
				add(targets, 'Fine');
			}
			if (sound.toCoda != null) {
				const coda = this.landmark('coda', sound.toCoda);
				add(jumps, coda && (coda === 'Coda' ? 'DaCoda' : 'DaDoubleCoda'));
			}
			const segno =
				sound.dalSegno == null ? null : this.landmark('segno', sound.dalSegno);
			const from = sound.daCapo ? 'DaCapo' : segno && `Da${segno}`;
			if (from) {
				add(jumps, from + jumpUntil(words));
			}
			if (
				sound.timeOnly != null &&
				(sound.daCapo || sound.dalSegno != null || sound.toCoda != null)
			) {
				this.values.unsupported('jumps on chosen passes');
			}
		}
		for (const direction of measure.directions) {
			if (
				direction.sound?.segno == null &&
				direction.navigations.includes('segno')
			) {
				add(targets, this.landmark('segno', 'segno'));
			}
			if (
				direction.sound?.coda == null &&
				direction.navigations.includes('coda')
			) {
				add(targets, this.landmark('coda', 'coda'));
			}
		}
		if (!targets.length && !jumps.length) {
			return;
		}
		const node = X.add(master, 'Directions');
		for (const target of targets) {
			X.add(node, 'Target', target);
		}
		for (const jump of jumps) {
			X.add(node, 'Jump', jump);
		}
	}
	/** The GPIF target (`Segno`/`SegnoSegno`, `Coda`/`DoubleCoda`) a landmark id names; null past two. */
	private landmark(kind: 'segno' | 'coda', id: string): string | null {
		const names =
			kind === 'segno' ? ['Segno', 'SegnoSegno'] : ['Coda', 'DoubleCoda'];
		const ids = this.landmarks[kind];
		const known = ids.get(id);
		if (known) {
			return known;
		}
		const second = kind === 'segno' ? 'segno-segno' : 'double-coda';
		const taken = new Set(ids.values());
		const name =
			id === second
				? names[1]!
				: names.find((candidate) => !taken.has(candidate));
		if (!name || (id === second && taken.has(name))) {
			this.values.unsupported(`more than two ${kind}s`);
			return null;
		}
		ids.set(id, name);
		return name;
	}
	private key(parent: MElement, measure: Measure, staff: string): void {
		const key = measure.getKey(staff);
		const mode = key?.mode;
		if (mode && mode !== 'major' && mode !== 'minor') {
			this.values.unsupported(`key mode ${mode}`);
		}
		const node = X.add(parent, 'Key');
		X.add(
			node,
			'AccidentalCount',
			GuitarProValues.integer(key?.fifths ?? 0, 'key fifths', -7, 7),
		);
		X.add(node, 'Mode', mode === 'minor' ? 'Minor' : 'Major');
		X.add(node, 'TransposeAs', (key?.fifths ?? 0) < 0 ? 'Flats' : 'Sharps');
	}
	private tempos(measure: Measure): TempoChange[] {
		const result: TempoChange[] = [];
		const barBeats =
			(Number(measure.getTime()?.beats ?? 4) * 4) /
			Number(measure.getTime()?.beatType ?? 4);
		const gradual = new Set<number>();
		for (const direction of measure.directions) {
			if (direction.words.some((text) => GRADUAL_TEMPO.test(text.trim()))) {
				gradual.add(direction.measureBeat ?? 0);
			}
		}
		const add = (beat: number | null, tempo: number): void => {
			if (beat == null || beat < 0 || beat >= barBeats) {
				this.values.unsupported('mid-measure tempo changes');
				return;
			}
			result.push({
				position: beat / barBeats,
				tempo,
				linear: gradual.has(beat),
			});
		};
		for (const sound of measure.sounds) {
			if (sound.tempo == null) {
				continue;
			}
			if (!Number.isFinite(sound.tempo) || sound.tempo <= 0) {
				throw new Error(`Invalid tempo: ${sound.tempo}`);
			}
			if (sound.parent instanceof Direction) {
				add(sound.parent.measureBeat, sound.tempo);
				continue;
			}
			const onset = onsetOf(measure, sound);
			const divisions = divisionsBackFrom(
				measure,
				measure.children.indexOf(sound),
			);
			add(onset == null || !divisions ? null : onset / divisions, sound.tempo);
		}
		for (const direction of measure.directions) {
			if (direction.sound?.tempo != null) {
				continue;
			}
			for (const mark of direction.metronomes) {
				const unit = mark.beatUnits[0];
				if (
					!unit ||
					mark.beatUnits.length !== 1 ||
					!Number.isFinite(Number(mark.perMinute)) ||
					Number(mark.perMinute) <= 0
				) {
					this.values.unsupported('non-numeric or compound metronome marks');
					continue;
				}
				const duration = GuitarProValues.durations[unit.type];
				if (duration == null) {
					throw new Error(`Unsupported metronome beat unit: ${unit.type}`);
				}
				add(
					direction.measureBeat,
					Number(mark.perMinute) *
						GuitarProValues.beats(duration, { dots: unit.dots }),
				);
			}
		}
		return result.toSorted((a, b) => a.position - b.position);
	}
	/**
	 * The one `<transpose>` a GPIF track can carry. Written pitches stay as notated;
	 * the track records the written-to-sounding shift, as Guitar Pro does.
	 */
	private transposition(part: Part): GuitarProTransposition {
		let found: GuitarProTransposition | null = null;
		for (const measure of part.measures) {
			for (let staff = 1; staff <= measure.staveCount; staff++) {
				const transpose = measure.getTranspose(String(staff));
				const current = {
					chromatic: GuitarProValues.integer(
						transpose?.chromatic ?? 0,
						'transpose chromatic',
						-11,
						11,
					),
					octave: GuitarProValues.integer(
						transpose?.octaveChange ?? 0,
						'transpose octave-change',
						-4,
						4,
					),
				};
				if (transpose?.double) {
					this.values.unsupported('<double>');
				}
				if (
					found &&
					(found.chromatic !== current.chromatic ||
						found.octave !== current.octave)
				) {
					throw new Error(
						'Guitar Pro export needs one transposition per part, but this part changes it across measures or staves',
					);
				}
				found = { ...current, shift: 0 };
			}
		}
		const result = found ?? { chromatic: 0, octave: 0, shift: 0 };
		result.shift = result.chromatic + 12 * result.octave;
		return result;
	}
	private writeStaff(
		part: Part,
		staves: MElement,
		id: string,
		shift: number,
	): void {
		const first = part.measures[0]!;
		const tunings = first
			.getStaffTunings(id)
			.toSorted((a, b) => a.line - b.line);
		if (tunings.some((t, i) => t.line !== i + 1)) {
			throw new Error(
				'Guitar Pro tuning lines must be consecutive starting at 1',
			);
		}
		const tuning = tunings.map((t) =>
			GuitarProValues.integer(t.midi, 'tuning pitch', 0, 127),
		);
		const capo = GuitarProValues.integer(
			first.getStaffDetails(id)?.capo ?? 0,
			'capo',
			0,
			36,
		);
		const pitches = new GuitarProPitchWriter(part, id, shift);
		const ctx: StaffContext = { id, tuning, capo, pitches, shift };
		const ottavas = this.effects.ottavas(part, id);
		const node = X.add(staves, 'Staff');
		X.addProperty(node, 'CapoFret', 'Fret', tuning.length ? capo : 0);
		X.addProperty(node, 'FretCount', 'Number', 24);
		const tuningNode = X.addProperty(
			node,
			'Tuning',
			'Pitches',
			(tuning.length ? tuning : pitches.tuning).join(' '),
		);
		X.add(tuningNode, 'Instrument', 'Guitar');
		X.add(tuningNode, 'LabelVisible', 'false');
		// Identical chord symbols share one diagram, as Guitar Pro's own do.
		const diagrams = new Map<string, string | null>();
		const diagramItems = new MElement('Items');
		const voiceIds = [
			...new Set(
				part.measures.flatMap((m) =>
					m.notes.filter((n) => n.staff === id).map((n) => n.voice),
				),
			),
		];
		if (voiceIds.length > 4) {
			throw new Error('Guitar Pro supports at most four voices per staff');
		}
		if (!voiceIds.length) {
			voiceIds.push('1');
		}
		for (const measure of part.measures) {
			const current = measure
				.getStaffTunings(id)
				.toSorted((a, b) => a.line - b.line)
				.map((t) => t.midi);
			if (
				JSON.stringify(current) !== JSON.stringify(tuning) ||
				(measure.getStaffDetails(id)?.capo ?? 0) !== capo
			) {
				throw new Error(
					'Guitar Pro export does not support mid-score tuning or capo changes',
				);
			}
			if (measure.clefChanges(id).length) {
				this.values.unsupported('mid-measure clef changes');
			}
			const clef = measure.getClef(id);
			if (clef?.octaveChange) {
				this.values.unsupported('octave clefs');
			}
			const clefName =
				!clef || clef.sign === 'TAB' ? 'G2' : `${clef.sign}${clef.line}`;
			if (!['G2', 'F4', 'C3', 'C4'].includes(clefName)) {
				throw new Error(`Unsupported Guitar Pro clef: ${clefName}`);
			}
			const bar = this.entry('Bars', 'Bar');
			X.add(bar, 'Clef', clefName);
			// GPIF stores the shared key in MasterBar; different staff keys cannot be encoded faithfully.
			const sharedKey = this.tables
				.get('MasterBars')!
				.childrenNamed('MasterBar')
				[measure.index]!.child('Key')!;
			if (
				Number(sharedKey.child('AccidentalCount')!.text) !==
					(measure.getKey(id)?.fifths ?? 0) ||
				sharedKey.child('Mode')!.text!.toLowerCase() !==
					(measure.getKey(id)?.mode ?? 'major')
			) {
				this.values.unsupported('different keys across staves or parts');
			}
			const masterBars = this.tables
				.get('MasterBars')!
				.childrenNamed('MasterBar')
				[measure.index]!.child('Bars')!;
			masterBars.setText(
				[...X.refs(masterBars), bar.getAttribute('id')!].join(' '),
			);
			const voices: string[] = [];
			const harmonies = measure.harmonies.filter((h) => h.staff === id);
			for (const voiceId of voiceIds) {
				const voice = this.entry('Voices', 'Voice');
				voices.push(voice.getAttribute('id')!);
				const beats: string[] = [];
				const chords = groupChords(
					measure.notes.filter((n) => n.staff === id && n.voice === voiceId),
				);
				let cursor = 0;
				for (const chord of chords) {
					const lead = chord.lead;
					const onset = lead.measureBeat;
					if (
						onset == null ||
						!Number.isFinite(onset) ||
						onset < cursor - 1e-8
					) {
						throw new Error(
							`Overlapping or invalid note timing in measure ${measure.number}`,
						);
					}
					this.rests(beats, onset - cursor);
					const pieces = this.pieces(lead, harmonies);
					for (const [index, piece] of pieces.entries()) {
						const beat = this.beat(lead, piece);
						beats.push(beat.getAttribute('id')!);
						const notes: string[] = [];
						for (const note of chord.notes) {
							if (
								note.beats !== lead.beats ||
								note.isGrace !== lead.isGrace ||
								note.type !== lead.type ||
								note.dots !== lead.dots ||
								JSON.stringify(note.timeModification) !==
									JSON.stringify(lead.timeModification)
							) {
								throw new Error(
									'Guitar Pro chord members must share a duration',
								);
							}
							if (!note.isRest) {
								notes.push(
									this.note(note, ctx, {
										index,
										count: pieces.length,
									}).getAttribute('id')!,
								);
							} else if (chord.notes.length !== 1) {
								throw new Error('Guitar Pro chords cannot contain rests');
							}
						}
						if (notes.length) {
							X.add(beat, 'Notes', notes.join(' '));
						}
						if (index === 0) {
							this.whammy(beat, lead);
							this.directions(beat, lead);
							this.effects.write(beat, chord.notes, ottavas);
							this.effects.writeFermata(
								this.tables.get('MasterBars')!.childrenNamed('MasterBar')[
									measure.index
								]!,
								chord.notes,
							);
						}
						const harmony = harmonies.findIndex(
							(h) => Math.abs((h.measureBeat ?? 0) - piece.onset) < 1e-8,
						);
						if (harmony >= 0 && !lead.isGrace) {
							const diagram = this.diagram(
								harmonies.splice(harmony, 1)[0]!,
								diagrams,
								diagramItems,
								tuning.length || 6,
							);
							if (diagram != null) {
								X.add(beat, 'Chord', diagram);
							}
						}
					}
					cursor = onset + (lead.isGrace ? 0 : lead.beats!);
				}
				if (!chords.length) {
					beats.push(this.rhythmBeat('whole', 0).getAttribute('id')!);
				}
				X.add(voice, 'Beats', beats.join(' '));
			}
			X.add(bar, 'Voices', voices.join(' '));
			for (const _ of harmonies) {
				this.values.unsupported('several chord symbols on one beat');
			}
		}
		if (diagramItems.children.length) {
			const props = node.child('Properties')!;
			X.add(props, 'Property', undefined, {
				name: 'DiagramCollection',
			}).append(diagramItems);
		}
	}
	/** The id of the staff diagram for a harmony, adding it on first use; null when it cannot be written. */
	private diagram(
		harmony: Harmony,
		diagrams: Map<string, string | null>,
		items: MElement,
		strings: number,
	): string | null {
		const frame = harmony.frame;
		const key = JSON.stringify([
			harmony.chords,
			harmony.printFrame,
			frame && [frame.strings, frame.frets, frame.firstFret],
			frame?.frameNotes.map((n) => [n.string, n.fret, n.fingering, n.barre]),
		]);
		if (!diagrams.has(key)) {
			const id = String(items.children.length);
			const item = writeDiagram(harmony, id, strings, this.values);
			if (item) {
				items.append(item);
			}
			diagrams.set(key, item ? id : null);
		}
		return diagrams.get(key)!;
	}
	private rhythmBeat(
		type: string,
		dots: number,
		ratio?: { actual: number; normal: number },
	): MElement {
		const beat = this.entry('Beats', 'Beat');
		const rhythm = this.entry('Rhythms', 'Rhythm');
		X.add(rhythm, 'NoteValue', type[0]!.toUpperCase() + type.slice(1));
		if (dots) {
			X.add(rhythm, 'AugmentationDot', undefined, { count: String(dots) });
		}
		if (ratio) {
			X.add(rhythm, 'PrimaryTuplet', undefined, {
				num: String(ratio.actual),
				den: String(ratio.normal),
			});
		}
		X.add(beat, 'Rhythm', undefined, { ref: rhythm.getAttribute('id')! });
		X.add(beat, 'ConcertPitchStemOrientation', 'Undefined');
		return beat;
	}
	/**
	 * The beats a chord is written as. A chord a harmony starts inside of is
	 * split there into tied beats, since a diagram hangs on a beat; one that
	 * cannot be split into ordinary note values stays whole.
	 */
	private pieces(lead: Note, harmonies: Harmony[]): BeatPiece[] {
		const onset = lead.measureBeat!;
		const whole: BeatPiece[] = [{ onset }];
		if (lead.isGrace || lead.timeModification || lead.beats == null) {
			return whole;
		}
		const end = onset + lead.beats;
		const cuts = [
			...new Set(
				harmonies
					.map((h) => h.measureBeat ?? 0)
					.filter((at) => at > onset + 1e-8 && at < end - 1e-8),
			),
		].sort((first, second) => first - second);
		if (!cuts.length) {
			return whole;
		}
		const pieces: BeatPiece[] = [];
		const bounds = [onset, ...cuts, end];
		for (let index = 0; index < bounds.length - 1; index++) {
			let at = bounds[index]!;
			let remaining = bounds[index + 1]! - at;
			while (remaining > 1e-8) {
				const value = noteValueWithin(remaining);
				if (!value) {
					return whole;
				}
				pieces.push({ onset: at, ...value });
				at += value.size;
				remaining -= value.size;
			}
		}
		return pieces;
	}
	private beat(note: Note, piece?: BeatPiece): MElement {
		const fullRest =
			note.isRest &&
			(note.child('rest')?.getAttribute('measure') === 'yes' ||
				((note.type === 'whole' || note.type == null) &&
					note.measure.notes.filter(
						(n) => n.voice === note.voice && n.staff === note.staff,
					).length === 1));
		const type = fullRest ? 'whole' : (note.type ?? '');
		const duration = GuitarProValues.durations[type];
		if (duration == null) {
			throw new Error(
				`Guitar Pro export requires a supported note type, got ${note.type}`,
			);
		}
		const dots = GuitarProValues.integer(note.dots, 'augmentation dots', 0, 3);
		const ratio = note.timeModification;
		if (ratio) {
			GuitarProValues.integer(ratio.actual, 'tuplet numerator', 1, 64);
			GuitarProValues.integer(ratio.normal, 'tuplet denominator', 1, 64);
		}
		if (!note.isGrace) {
			const expected = fullRest
				? (Number(note.measure.getTime()?.beats ?? 4) * 4) /
					Number(note.measure.getTime()?.beatType ?? 4)
				: GuitarProValues.beats(duration, {
						dots,
						actual: ratio?.actual,
						normal: ratio?.normal,
					});
			if (
				note.beats == null ||
				!Number.isFinite(note.beats) ||
				Math.abs(note.beats - expected) > 1e-8
			) {
				throw new Error(
					`Note duration disagrees with its notation in measure ${note.measure.number}`,
				);
			}
		}
		const beat = piece?.type
			? this.rhythmBeat(piece.type, piece.dots!)
			: this.rhythmBeat(type, dots, ratio ?? undefined);
		if (note.isGrace) {
			X.add(beat, 'GraceNotes', note.graceSlash ? 'BeforeBeat' : 'OnBeat');
		}
		return beat;
	}
	private whammy(beat: MElement, lead: Note): void {
		const bend = lead.bend;
		if (!bend || bend.withBar == null) {
			return;
		}
		const peak = (bend.semitones * 50).toFixed(6);
		const zero = (0).toFixed(6);
		X.add(beat, 'Whammy', undefined, {
			originValue: bend.preBend ? peak : zero,
			middleValue: peak,
			destinationValue: bend.release ? zero : peak,
			originOffset: zero,
			middleOffset1: (50).toFixed(6),
			middleOffset2: (50).toFixed(6),
			destinationOffset: (100).toFixed(6),
		});
	}
	private note(
		source: Note,
		staff: StaffContext,
		piece = { index: 0, count: 1 },
	): MElement {
		if (!source.pitch) {
			throw new Error(
				'Guitar Pro export requires pitched notes; percussion is not supported',
			);
		}
		const writtenMidi = GuitarProValues.midi(source.pitch);
		const midi = GuitarProValues.integer(
			writtenMidi + staff.shift,
			'sounding MIDI pitch',
			0,
			127,
		);
		for (const tie of source.ties) {
			if (tie.tieType === 'let-ring') {
				continue;
			}
			const partner = tie.partner?.note;
			if (
				!partner?.pitch ||
				GuitarProValues.midi(partner.pitch) !== writtenMidi ||
				partner.voice !== source.voice ||
				partner.staff !== source.staff
			) {
				throw new Error(
					'Guitar Pro ties must connect matching pitches in the same voice and staff',
				);
			}
		}
		let string: number;
		let fret: number;
		if (source.string != null || source.fret != null) {
			if (
				!staff.tuning.length ||
				source.string == null ||
				source.fret == null
			) {
				throw new Error(
					'Guitar Pro tablature requires tuning, string and fret',
				);
			}
			string =
				staff.tuning.length -
				GuitarProValues.integer(
					source.string,
					'string',
					1,
					staff.tuning.length,
				);
			fret = GuitarProValues.integer(source.fret, 'fret', 0, 99);
			if (staff.tuning[string]! + staff.capo + fret !== midi) {
				throw new Error('Note pitch disagrees with its string, fret and capo');
			}
		} else {
			if (staff.tuning.length) {
				throw new Error(
					'Every pitched note on a Guitar Pro tablature staff needs a string and fret',
				);
			}
			string = staff.pitches.strings.get(source)!;
			fret = midi - staff.pitches.tuning[string]!;
		}
		const node = this.entry('Notes', 'Note');
		X.addProperty(node, 'String', 'String', string);
		X.addProperty(node, 'Fret', 'Fret', fret);
		X.addProperty(node, 'Midi', 'Number', midi);
		const concert = GuitarProValues.pitch(midi, {
			flats: (source.measure.getKey(source.staff)?.fifths ?? 0) < 0,
		});
		const written = staff.shift
			? {
					step: source.pitch.step,
					alter: source.pitch.alter ?? 0,
					octave: source.pitch.octave,
				}
			: concert;
		for (const [name, pitch] of [
			['ConcertPitch', concert],
			['TransposedPitch', written],
		] as const) {
			const prop = X.add(node.child('Properties')!, 'Property', undefined, {
				name,
			});
			const p = X.add(prop, 'Pitch');
			X.add(p, 'Step', pitch.step);
			X.add(
				p,
				'Accidental',
				({ '-1': 'b', '0': '', '1': '#' } as Record<string, string>)[
					String(pitch.alter)
				]!,
			);
			X.add(p, 'Octave', pitch.octave + 1);
		}
		X.add(node, 'InstrumentArticulation', 0);
		const start =
			piece.index < piece.count - 1 ||
			source.ties.some(
				(t) => t.tieType === 'start' || t.tieType === 'continue',
			);
		const stop =
			piece.index > 0 ||
			source.ties.some((t) => t.tieType === 'stop' || t.tieType === 'continue');
		if (start || stop) {
			X.add(node, 'Tie', undefined, {
				origin: String(start),
				destination: String(stop),
			});
		}
		if (piece.index > 0) {
			return node;
		}
		this.techniques(source, node);
		const accent =
			(source.articulations.includes('staccato') ? 1 : 0) |
			(source.articulations.includes('strong-accent') ? 4 : 0) |
			(source.articulations.includes('accent') ? 8 : 0);
		if (accent) {
			X.add(node, 'Accent', accent);
		}
		return node;
	}
	private techniques(source: Note, node: MElement): void {
		const flag = (name: string) => {
			const prop = X.add(node.child('Properties')!, 'Property', undefined, {
				name,
			});
			X.add(prop, 'Enable');
		};
		const notehead = source.notehead;
		if (notehead?.value === 'x') {
			flag('Muted');
		}
		if (source.isPalmMuted) {
			flag('PalmMuted');
		}
		const harmonic = source.harmonic;
		if (harmonic) {
			flag('Harmonic');
			X.addProperty(
				node,
				'HarmonicType',
				'HType',
				GuitarProValues.harmonicType(harmonic),
			);
			X.addProperty(node, 'HarmonicFret', 'HFret', '12.000000');
		}
		const bend = source.bend;
		if (bend && bend.withBar == null) {
			const peak = bend.semitones * 50;
			const float = (name: string, value: number) =>
				X.addProperty(node, name, 'Float', value.toFixed(6));
			flag('Bended');
			float('BendOriginValue', bend.preBend ? peak : 0);
			float('BendOriginOffset', 0);
			float('BendMiddleValue', peak);
			float('BendMiddleOffset1', 50);
			float('BendMiddleOffset2', 50);
			float('BendDestinationValue', bend.release ? 0 : peak);
			float('BendDestinationOffset', 100);
		}
		if (notehead?.parentheses) {
			X.add(node, 'AntiAccent', 'Normal');
		}
		if (source.isLetRing) {
			X.add(node, 'LetRing');
		}
	}
	private directions(beat: MElement, note: Note): void {
		let dynamic = 'F';
		for (const measure of note.part.measures.slice(0, note.measure.index + 1)) {
			for (const direction of measure.directions) {
				if (
					direction.staff !== note.staff ||
					(measure === note.measure &&
						(direction.measureBeat ?? 0) > note.measureBeat!)
				) {
					continue;
				}
				for (const mark of direction.dynamics.flatMap((d) => d.marks)) {
					if (
						!['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'].includes(mark)
					) {
						this.values.unsupported(`dynamic ${mark}`);
					} else {
						dynamic = mark.toUpperCase();
					}
				}
				const words = direction.words
					.filter((text) => text && !GRADUAL_TEMPO.test(text.trim()))
					.join(' ');
				if (
					words &&
					!this.isNavigation(direction) &&
					measure === note.measure &&
					direction.measureBeat === note.measureBeat
				) {
					X.add(beat, 'FreeText', words);
				}
			}
		}
		X.add(beat, 'Dynamic', dynamic);
	}
	/** A segno, coda or jump, which GPIF keeps on its MasterBar rather than as beat text. */
	private isNavigation(direction: Direction): boolean {
		const sound = direction.sound;
		return (
			direction.navigations.length > 0 ||
			(sound != null &&
				(sound.segno != null ||
					sound.coda != null ||
					sound.fine != null ||
					sound.toCoda != null ||
					sound.dalSegno != null ||
					sound.daCapo))
		);
	}
	private rests(beats: string[], gap: number): void {
		let remaining = gap;
		for (const [type, duration] of Object.entries(GuitarProValues.durations)) {
			const size = 4 / duration;
			while (remaining >= size - 1e-8) {
				beats.push(this.rhythmBeat(type, 0).getAttribute('id')!);
				remaining -= size;
			}
		}
		if (Math.abs(remaining) > 1e-8) {
			throw new Error(
				'Guitar Pro export cannot represent this gap with ordinary rests',
			);
		}
	}
	private checkAnnotations(element: MElement): void {
		// Measure harmonies are checked as they are written to chord diagrams.
		if (element.tag === 'harmony' && element.parent?.tag === 'measure') {
			return;
		}
		const unsupported = new Set([
			'hammer-on',
			'pull-off',
			'slide',
			'glissando',
			'slur',
			'harmony',
			'fingering',
			'pluck',
			'wedge',
			'pedal',
			'unpitched',
			'non-arpeggiate',
			'senza-misura',
			'swing',
		]);
		if (unsupported.has(element.tag)) {
			this.values.unsupported(`<${element.tag}>`);
		}
		if (element.tag === 'notehead') {
			if (!['x', 'normal'].includes(element.text ?? 'normal')) {
				this.values.unsupported(`<notehead> ${element.text}`);
			}
		}
		if (element.tag === 'other-technical') {
			if (!/^(P\.?M\.?|palm mute)/i.test(element.text ?? '')) {
				this.values.unsupported('<other-technical>');
			}
		}
		if (element.tag === 'fermata' && element.parent?.tag !== 'notations') {
			this.values.unsupported(`<${element.parent?.tag}> fermatas`);
		}
		if (element.tag === 'tremolo') {
			const type = element.getAttribute('type') ?? 'single';
			if (type !== 'single') {
				this.values.unsupported(`<tremolo> ${type}`);
			}
		}
		if (element.tag === 'articulations') {
			for (const mark of element.childrenOfType(MElement)) {
				if (!['staccato', 'accent', 'strong-accent'].includes(mark.tag)) {
					this.values.unsupported(`<${mark.tag}>`);
				}
			}
		}
		const supportedChildren: Record<string, string[]> = {
			notations: [
				'tied',
				'tuplet',
				'technical',
				'articulations',
				'fermata',
				'arpeggiate',
				'ornaments',
			],
			ornaments: ['tremolo'],
			technical: [
				'string',
				'fret',
				'harmonic',
				'bend',
				'other-technical',
				'up-bow',
				'down-bow',
				'tap',
			],
			'direction-type': [
				'metronome',
				'dynamics',
				'words',
				'segno',
				'coda',
				'octave-shift',
			],
		};
		const allowed = supportedChildren[element.tag];
		if (allowed) {
			for (const child of element.childrenOfType(MElement)) {
				if (!allowed.includes(child.tag)) {
					this.values.unsupported(`<${child.tag}>`);
				}
			}
		}
		for (const child of element.childrenOfType(MElement)) {
			this.checkAnnotations(child);
		}
	}
}
