// SPDX-License-Identifier: MPL-2.0
// GPIF field interpretation adapted from alphaTab's GpifParser. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProValues } from './guitar-pro-values';
import { GuitarProXml as X } from './guitar-pro-xml';
import { MDocument } from './m-document';
import { MElement, required } from './m-node';
import { appendValue, type Measure } from './measure';
import { buildPitch, Note } from './note';
import { StaffDetails } from './staff-details';
import { StaffTuning } from './staff-tuning';

interface StaffContext {
	id: string;
	tuning: number[];
	capo: number;
	tablature: boolean;
}
interface Rhythm {
	type: string;
	dots: number;
	actual: number;
	normal: number;
}

/** Resolves GPIF tables straight into the MusicXML-backed mdom tree. */
export class GuitarProDocumentReader {
	private readonly values: GuitarProValues;
	constructor(
		private readonly xml: X,
		opts: GuitarProOptions = {},
	) {
		this.values = new GuitarProValues(opts);
	}
	read(tablature: boolean[] = []): MDocument {
		const root = this.xml.root;
		const trackIds = X.refs(root.child('MasterTrack')?.child('Tracks'));
		const tracks = trackIds.map((id) => this.xml.get('Tracks', id));
		const masters = required(
			root.child('MasterBars'),
			'GPIF MasterBars',
		).childrenNamed('MasterBar');
		if (!tracks.length || !masters.length) {
			throw new Error(
				'Guitar Pro score must have at least one track and measure',
			);
		}
		if (
			root.child('AudioTracks')?.childrenOfType(MElement).length ||
			root.child('BackingTrack')
		) {
			this.values.unsupported('embedded audio');
		}
		const doc = MDocument.empty();
		const info = root.child('Score');
		if (info?.child('Title')?.text) {
			appendValue(doc.score, 'movement-title', info.child('Title')!.text!);
		}
		const identification = new MElement('identification');
		for (const [tag, type] of [
			['Music', 'composer'],
			['Words', 'lyricist'],
			['Artist', 'artist'],
		]) {
			const text = info?.child(tag!)?.text;
			if (text) {
				appendValue(identification, 'creator', text).setAttribute(
					'type',
					type!,
				);
			}
		}
		if (info?.child('Copyright')?.text) {
			appendValue(identification, 'rights', info.child('Copyright')!.text!);
		}
		doc.score.append(identification);
		let barOffset = 0;
		const totalStaves = tracks.reduce(
			(n, t) => n + (t.child('Staves')?.childrenNamed('Staff').length || 1),
			0,
		);
		for (const [index, track] of tracks.entries()) {
			if (
				track
					.child('InstrumentSet')
					?.child('Type')
					?.text?.toLowerCase()
					.includes('drum') ||
				track
					.child('InstrumentSet')
					?.child('Elements')
					?.childrenNamed('Element')
					.some((e) => e.child('Type')?.text === 'percussion') ||
				track.child('GeneralMidi')?.getAttribute('table') === 'Percussion'
			) {
				throw new Error('Guitar Pro percussion tracks are not supported');
			}

			this.checkTrackAutomations(track);
			const part = doc.score.addPart({ name: track.child('Name')?.text ?? '' });
			const scorePart = doc.score
				.child('part-list')!
				.childrenNamed('score-part')
				.at(-1)!;
			const instrument = new MElement('score-instrument');
			instrument.setAttribute('id', `${part.id}-I1`);
			appendValue(instrument, 'instrument-name', part.label || 'Instrument');
			scorePart.append(instrument);
			const midi = new MElement('midi-instrument');
			midi.setAttribute('id', `${part.id}-I1`);
			const sound =
				track.child('Sounds')?.child('Sound')?.child('MIDI') ??
				track.child('GeneralMidi');
			const program = GuitarProValues.integer(
				Number(sound?.child('Program')?.text ?? 0),
				'MIDI program',
				0,
				127,
			);
			const connection =
				track.child('MidiConnection') ?? track.child('GeneralMidi');
			const channel = GuitarProValues.integer(
				Number(connection?.child('PrimaryChannel')?.text ?? 0),
				'MIDI channel',
				0,
				15,
			);
			appendValue(midi, 'midi-channel', String(channel + 1));
			appendValue(midi, 'midi-program', String(program + 1));
			scorePart.append(midi);
			const staffNodes = track.child('Staves')?.childrenNamed('Staff') ?? [
				track,
			];
			if (!staffNodes.length) {
				throw new Error('Guitar Pro track has no staves');
			}
			const staves = staffNodes.map((node, i) =>
				this.staff(node, String(i + 1), tablature[index]),
			);
			// Tie destinations identify their predecessor by string, or pitch for notation-only data.
			const previousNotes = new Map<string, Note>();
			for (const [measureIndex, master] of masters.entries()) {
				const measure = part.addMeasure();
				this.readMaster(master, measure);
				measure.setStaveCount(staves.length);
				const barIds = X.refs(master.child('Bars'));
				if (barIds.length !== totalStaves) {
					throw new Error(
						`Invalid GPIF bar count in measure ${measure.number}`,
					);
				}
				const bars = staves.map((_, i) =>
					this.xml.get('Bars', barIds[barOffset + i]!),
				);
				measure.setDivisions(this.divisions(bars));
				let cursor = 0;
				for (const [staffIndex, staff] of staves.entries()) {
					const bar = bars[staffIndex]!;
					this.readStaff(staff, bar, master, measure);
					const voices = X.refs(bar.child('Voices'));
					if (voices.length > 4) {
						throw new Error(
							'Guitar Pro supports at most four voices per staff',
						);
					}
					if (!voices.length) {
						voices.push('-1');
					}
					for (const [slot, id] of voices.entries()) {
						if (id === '-1' && slot !== 0) {
							continue;
						}
						const beats =
							id === '-1'
								? []
								: X.refs(this.xml.get('Voices', id).child('Beats')).map((ref) =>
										this.xml.get('Beats', ref),
									);
						if (!beats.length && slot !== 0) {
							continue;
						}
						if (cursor > 0) {
							appendValue(X.add(measure, 'backup'), 'duration', String(cursor));
						}
						cursor = 0;
						const voice = String(staffIndex * 4 + slot + 1);
						if (!beats.length) {
							cursor = this.readBeat(
								null,
								measure,
								staff,
								voice,
								true,
								previousNotes,
							);
						}
						for (const beat of beats) {
							const fullRest =
								beats.length === 1 &&
								!X.refs(beat.child('Notes')).length &&
								this.rhythm(beat).type === 'whole';
							cursor += this.readBeat(
								beat,
								measure,
								staff,
								voice,
								fullRest,
								previousNotes,
							);
						}
					}
				}
				const repeat = master.child('Repeat');
				if (
					repeat?.getAttribute('end') === 'true' ||
					master.child('DoubleBar')
				) {
					const times =
						repeat?.getAttribute('end') === 'true'
							? GuitarProValues.integer(
									Number(repeat.getAttribute('count') ?? 2),
									'repeat count',
									2,
									100,
								)
							: undefined;
					measure.addBarline({
						barStyle: times ? 'light-heavy' : 'light-light',
						repeat: times ? { direction: 'backward', times } : undefined,
					});
				}
				if (
					measureIndex === 0 &&
					root.child('MasterTrack')?.child('Anacrusis')
				) {
					measure.setAttribute('implicit', 'yes');
				}
			}
			// GPIF may contain unused lyric templates even on empty tracks.
			if (
				part.measures.some((m) => m.notes.some((n) => !n.isRest)) &&
				track
					.child('Lyrics')
					?.childrenNamed('Line')
					.some((l) => l.child('Text')?.text?.trim())
			) {
				this.values.unsupported('lyrics');
			}

			barOffset += staves.length;
		}
		return doc;
	}
	private checkTrackAutomations(track: MElement): void {
		for (const a of track.child('Automations')?.childrenNamed('Automation') ??
			[]) {
			const type = a.child('Type')?.text;
			if (
				type === 'Sound' &&
				Number(a.child('Bar')?.text ?? 0) === 0 &&
				Number(a.child('Position')?.text ?? 0) <= 0
			) {
				continue;
			}
			this.values.unsupported('instrument changes or track automation');
		}
	}
	private staff(node: MElement, id: string, show?: boolean): StaffContext {
		const tuning = X.refs(X.property(node, 'Tuning')?.child('Pitches')).map(
			(n) => GuitarProValues.integer(Number(n), 'tuning pitch', 0, 127),
		);
		const capo = GuitarProValues.integer(
			Number(X.property(node, 'CapoFret')?.child('Fret')?.text ?? 0),
			'capo',
			0,
			36,
		);
		if (
			Number(X.property(node, 'PartialCapoFret')?.child('Fret')?.text ?? 0) !==
			0
		) {
			this.values.unsupported('partial capo');
		}
		return { id, tuning, capo, tablature: show ?? tuning.length > 0 };
	}
	private readMaster(master: MElement, measure: Measure): void {
		const time = required(
			master.child('Time')?.text,
			'GPIF time signature',
		).split('/');
		if (time.length !== 2) {
			throw new Error('Invalid GPIF time signature');
		}
		const beats = GuitarProValues.integer(
			Number(time[0]),
			'time numerator',
			1,
			64,
		);
		const beatType = GuitarProValues.integer(
			Number(time[1]),
			'time denominator',
			1,
			128,
		);
		if ((beatType & (beatType - 1)) !== 0) {
			throw new Error('Guitar Pro time denominator must be a power of two');
		}
		measure.setTime({ beats, beatType });
		if (master.child('Repeat')?.getAttribute('start') === 'true') {
			measure.addBarline({
				location: 'left',
				repeat: { direction: 'forward' },
			});
		}
		if (
			['AlternateEndings', 'Directions', 'FreeTime', 'Fermatas'].some((tag) =>
				master.child(tag),
			) ||
			(master.child('TripletFeel')?.text &&
				master.child('TripletFeel')?.text !== 'NoTripletFeel')
		) {
			this.values.unsupported('alternate endings, jumps, free time or swing');
		}
		for (const a of this.xml.root
			.child('MasterTrack')
			?.child('Automations')
			?.childrenNamed('Automation') ?? []) {
			if (Number(a.child('Bar')?.text ?? 0) !== measure.index) {
				continue;
			}
			if (a.child('Type')?.text !== 'Tempo') {
				this.values.unsupported('master automation');
				continue;
			}
			if (
				Number(a.child('Position')?.text ?? 0) !== 0 ||
				a.child('Linear')?.text === 'true'
			) {
				this.values.unsupported('mid-measure or gradual tempo changes');
				continue;
			}
			const [value, unit = '2'] = X.refs(a.child('Value'));
			const factors: Record<string, number> = {
				'1': 0.5,
				'2': 1,
				'3': 1.5,
				'4': 2,
				'5': 3,
			};
			const factor = required(factors[unit], 'GPIF tempo unit');
			const tempo = Number(value) * factor;
			if (!Number.isFinite(tempo) || tempo <= 0) {
				throw new Error('Invalid GPIF tempo');
			}
			measure.addDirection({
				metronome: { beatUnit: 'quarter', perMinute: tempo },
				tempo,
			});
		}
	}
	private readStaff(
		staff: StaffContext,
		bar: MElement,
		master: MElement,
		measure: Measure,
	): void {
		const clef = bar.child('Clef')?.text ?? 'G2';
		if (!['G2', 'F4', 'C3', 'C4'].includes(clef)) {
			throw new Error(`Unsupported Guitar Pro clef: ${clef}`);
		}
		if (
			bar.child('Ottavia')?.text &&
			bar.child('Ottavia')?.text !== 'Regular'
		) {
			this.values.unsupported('octave clefs');
		}
		const key = master.child('Key');
		const fifths = GuitarProValues.integer(
			Number(key?.child('AccidentalCount')?.text ?? 0),
			'key fifths',
			-7,
			7,
		);
		const mode = key?.child('Mode')?.text ?? 'Major';
		if (!['Major', 'Minor'].includes(mode)) {
			this.values.unsupported(`key mode ${mode}`);
		}
		measure.setKey({
			fifths,
			mode: mode === 'Minor' ? 'minor' : 'major',
			staff: staff.id,
		});
		measure.setClef({ sign: clef[0]!, line: Number(clef[1]), staff: staff.id });
		if (measure.index === 0 && staff.tablature && staff.tuning.length) {
			const details = new StaffDetails();
			details.setAttribute('number', staff.id);
			appendValue(details, 'staff-lines', String(staff.tuning.length));
			for (const [index, midi] of staff.tuning.entries()) {
				const tuning = new StaffTuning();
				tuning.setAttribute('line', String(index + 1));
				const pitch = GuitarProValues.pitch(midi);
				appendValue(tuning, 'tuning-step', pitch.step);
				appendValue(tuning, 'tuning-alter', String(pitch.alter));
				appendValue(tuning, 'tuning-octave', String(pitch.octave));
				details.append(tuning);
			}
			appendValue(details, 'capo', String(staff.capo));
			measure.getOrCreateAttributes().append(details);
		}
	}
	private rhythm(beat: MElement): Rhythm {
		const ref = required(
			beat.child('Rhythm')?.getAttribute('ref'),
			'GPIF rhythm reference',
		);
		const node = this.xml.get('Rhythms', ref);
		const type = required(
			node.child('NoteValue')?.text,
			'GPIF note value',
		).toLowerCase();
		if (GuitarProValues.durations[type] == null) {
			throw new Error(`Unsupported Guitar Pro duration: ${type}`);
		}
		const dots = GuitarProValues.integer(
			Number(node.child('AugmentationDot')?.getAttribute('count') ?? 0),
			'augmentation dots',
			0,
			3,
		);
		const tuplet = node.child('PrimaryTuplet');
		const actual = GuitarProValues.integer(
			Number(tuplet?.getAttribute('num') ?? 1),
			'tuplet numerator',
			1,
			64,
		);
		const normal = GuitarProValues.integer(
			Number(tuplet?.getAttribute('den') ?? 1),
			'tuplet denominator',
			1,
			64,
		);
		return { type, dots, actual, normal };
	}
	private divisions(bars: MElement[]): number {
		let divisions = 256;
		for (const bar of bars) {
			for (const id of X.refs(bar.child('Voices'))) {
				if (id === '-1') {
					continue;
				}
				for (const ref of X.refs(this.xml.get('Voices', id).child('Beats'))) {
					const rhythm = this.rhythm(this.xml.get('Beats', ref));
					let a = divisions;
					let b = rhythm.actual;
					while (b) {
						[a, b] = [b, a % b];
					}
					divisions = (divisions / a) * rhythm.actual;
					if (!Number.isSafeInteger(divisions) || divisions > 100_000_000) {
						throw new Error(
							'Guitar Pro tuplet ratios require too many divisions',
						);
					}
				}
			}
		}
		return divisions;
	}
	private readBeat(
		beat: MElement | null,
		measure: Measure,
		staff: StaffContext,
		voice: string,
		fullRest: boolean,
		previous: Map<string, Note>,
	): number {
		const rhythm = beat
			? this.rhythm(beat)
			: { type: 'whole', dots: 0, actual: 1, normal: 1 };
		const grace = beat?.child('GraceNotes')?.text;
		if (grace && !['BeforeBeat', 'OnBeat'].includes(grace)) {
			this.values.unsupported(`grace type ${grace}`);
		}
		const divisions = Number(
			measure.child('attributes')!.child('divisions')!.text,
		);
		let beats = GuitarProValues.beats(
			GuitarProValues.durations[rhythm.type]!,
			rhythm,
		);
		if (fullRest) {
			beats =
				(Number(measure.getTime()!.beats) * 4) /
				Number(measure.getTime()!.beatType);
		}
		const duration = grace ? 0 : beats * divisions;
		if (!Number.isInteger(duration)) {
			throw new Error(
				`Cannot represent Guitar Pro duration in measure ${measure.number}`,
			);
		}
		if (beat) {
			this.checkBeat(beat);
			const dynamic = (beat.child('Dynamic')?.text ?? 'F').toLowerCase();
			if (!['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'].includes(dynamic)) {
				this.values.unsupported(`dynamic ${dynamic}`);
			} else if (!grace) {
				measure.addDirection({ dynamics: dynamic, staff: staff.id });
			}
			const text = beat.child('FreeText')?.text;
			if (text) {
				measure.addDirection({ words: text, staff: staff.id });
			}
		}
		const sources = beat
			? X.refs(beat.child('Notes')).map((id) => this.xml.get('Notes', id))
			: [];
		const notes: (MElement | null)[] = sources.length ? sources : [null];
		for (const [index, source] of notes.entries()) {
			const note = new Note();
			if (grace) {
				X.add(
					note,
					'grace',
					undefined,
					grace === 'BeforeBeat' ? { slash: 'yes' } : {},
				);
			}
			if (index) {
				X.add(note, 'chord');
			}
			let pitch = 0;
			if (source) {
				pitch = this.pitch(source, staff);
				note.append(
					buildPitch(
						GuitarProValues.pitch(pitch, {
							flats: (measure.getKey(staff.id)?.fifths ?? 0) < 0,
						}),
					),
				);
			} else {
				X.add(note, 'rest', undefined, fullRest ? { measure: 'yes' } : {});
			}
			if (duration) {
				appendValue(note, 'duration', String(duration));
			}
			appendValue(note, 'voice', voice);
			if (!fullRest) {
				appendValue(note, 'type', rhythm.type);
				for (let dot = 0; dot < rhythm.dots; dot++) {
					X.add(note, 'dot');
				}
			}
			if (rhythm.actual !== 1 || rhythm.normal !== 1) {
				const ratio = X.add(note, 'time-modification');
				appendValue(ratio, 'actual-notes', String(rhythm.actual));
				appendValue(ratio, 'normal-notes', String(rhythm.normal));
			}
			appendValue(note, 'staff', staff.id);
			measure.append(note);
			if (source) {
				this.readNote(source, note, staff);
				const string = X.property(source, 'String')?.child('String')?.text;
				const key = `${voice}:${string == null ? `pitch${pitch}` : `string${string}`}`;
				if (source.child('Tie')?.getAttribute('destination') === 'true') {
					const origin = previous.get(key);
					if (!origin?.pitch || GuitarProValues.midi(origin.pitch) !== pitch) {
						throw new Error(
							'Guitar Pro ties must connect matching pitches in the same voice and staff',
						);
					}
					origin.addTie(note);
				}
				previous.set(key, note);
			}
		}
		return duration;
	}
	private pitch(note: MElement, staff: StaffContext): number {
		const string = X.property(note, 'String')?.child('String')?.text;
		const fret = X.property(note, 'Fret')?.child('Fret')?.text;
		if (string != null && fret != null && staff.tuning.length) {
			const index = GuitarProValues.integer(
				Number(string),
				'string index',
				0,
				staff.tuning.length - 1,
			);
			return GuitarProValues.integer(
				staff.tuning[index]! +
					staff.capo +
					GuitarProValues.integer(Number(fret), 'fret', 0, 127),
				'MIDI pitch',
				0,
				127,
			);
		}
		const midi = X.property(note, 'Midi')?.child('Number')?.text;
		if (midi != null) {
			return GuitarProValues.integer(Number(midi), 'MIDI pitch', 0, 127);
		}
		const pitch = X.property(note, 'ConcertPitch')?.child('Pitch');
		if (pitch) {
			const accidental = pitch.child('Accidental')?.text ?? '';
			const alter = required(
				({ '': 0, '#': 1, b: -1, x: 2, bb: -2 } as Record<string, number>)[
					accidental
				],
				'GPIF accidental',
			);
			return GuitarProValues.midi({
				step: required(pitch.child('Step')?.text, 'GPIF pitch step'),
				octave:
					Number(required(pitch.child('Octave')?.text, 'GPIF pitch octave')) -
					1,
				alter,
			});
		}
		const octave = X.property(note, 'Octave')?.child('Number')?.text;
		const tone = X.property(note, 'Tone')?.child('Step')?.text;
		if (octave != null && tone != null) {
			return GuitarProValues.integer(
				Number(octave) * 12 + Number(tone),
				'MIDI pitch',
				0,
				127,
			);
		}
		throw new Error('Guitar Pro note has no usable pitch');
	}
	private readNote(source: MElement, note: Note, staff: StaffContext): void {
		if (
			[
				'LetRing',
				'Trill',
				'Vibrato',
				'LeftFingering',
				'RightFingering',
				'Ornament',
				'AntiAccent',
			].some((tag) => source.child(tag)) ||
			source
				.child('Properties')
				?.childrenNamed('Property')
				.some((p) =>
					/^(Bend|Bended|Harmonic|Hopo|Slide|Muted|PalmMuted|Tapped|LeftHandTapped)/.test(
						p.getAttribute('name') ?? '',
					),
				)
		) {
			this.values.unsupported('note techniques');
		}
		const string = X.property(source, 'String')?.child('String')?.text;
		const fret = X.property(source, 'Fret')?.child('Fret')?.text;
		if (staff.tablature && string != null && fret != null) {
			note.setStringFret({
				string: staff.tuning.length - Number(string),
				fret: Number(fret),
			});
		}
		const accent = Number(source.child('Accent')?.text ?? 0);
		if (accent & 1) {
			note.addArticulation('staccato');
		}
		if (accent & 4) {
			note.addArticulation('strong-accent');
		} else if (accent & 8) {
			note.addArticulation('accent');
		}
		if (accent & ~13) {
			this.values.unsupported('note accent');
		}
	}
	private checkBeat(beat: MElement): void {
		const tags = [
			'Whammy',
			'WhammyBar',
			'Vibrato',
			'Fade',
			'Fadding',
			'Hairpin',
			'Arpeggio',
			'Brush',
			'Chord',
			'Lyrics',
			'Legato',
			'Tremolo',
			'Ottavia',
			'Fermata',
			'Slap',
			'Pop',
			'Tap',
			'Wah',
		];
		const props = [
			'Whammy',
			'Brush',
			'PickStroke',
			'Slapped',
			'Popped',
			'Tapped',
			'PalmMuted',
			'LetRing',
		];
		if (
			tags.some((tag) => beat.child(tag)) ||
			beat
				.child('Properties')
				?.childrenNamed('Property')
				.some((p) =>
					props.some((name) => p.getAttribute('name')?.startsWith(name)),
				)
		) {
			this.values.unsupported('beat effects or annotations');
		}
	}
}
