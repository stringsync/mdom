// SPDX-License-Identifier: MPL-2.0
// GPIF field encoding adapted from alphaTab's GpifWriter. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import { groupChords } from './chord';
import { Direction } from './direction';
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProPitchWriter } from './guitar-pro-pitch-writer';
import { GuitarProPlayback } from './guitar-pro-playback';
import { GuitarProValues } from './guitar-pro-values';
import { GuitarProXml as X } from './guitar-pro-xml';
import { MDocument } from './m-document';
import { MElement } from './m-node';
import type { Measure } from './measure';
import type { Note } from './note';
import type { Part } from './part';
import { onsetOf } from './timeline';

interface StaffContext {
	id: string;
	tuning: number[];
	capo: number;
	pitches: GuitarProPitchWriter;
}

/** Writes GPIF tables directly from mdom notes; no external score model. */
export class GuitarProScoreWriter {
	private readonly values: GuitarProValues;
	private readonly root = new MElement('GPIF');
	private readonly tables = new Map<string, MElement>();
	constructor(opts: GuitarProOptions = {}) {
		this.values = new GuitarProValues(opts);
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
		X.add(masterTrack, 'Tracks', parts.map((_, i) => i).join(' '));
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
		for (const measure of first.measures) {
			const master = this.masterBar(measure);
			this.tables.get('MasterBars')!.append(master);
			X.add(master, 'Bars', '');
			for (const tempo of this.tempos(measure)) {
				this.automation(tempos, 'Tempo', measure.index, `${tempo} 2`);
			}
		}
		for (const [index, part] of parts.entries()) {
			if (part.measures.length !== first.measures.length) {
				throw new Error(
					'Guitar Pro parts must have the same number of measures',
				);
			}
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
			new GuitarProPlayback().write(track, program, channel);
			const staves = X.add(track, 'Staves');
			const staffCount = GuitarProValues.integer(
				part.measures[0]!.staveCount,
				'staff count',
				1,
				2,
			);
			for (const measure of part.measures) {
				if (
					measure.notes.some(
						(n) => !['1', '2'].slice(0, staffCount).includes(n.staff),
					)
				) {
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
			for (let staff = 1; staff <= staffCount; staff++) {
				this.writeStaff(part, staves, String(staff));
			}
		}
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
	): void {
		const node = X.add(parent, 'Automation');
		for (const [tag, text] of Object.entries({
			Type: type,
			Linear: 'false',
			Bar: String(bar),
			Position: '0',
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
	private tempos(measure: Measure): number[] {
		const result: number[] = [];
		for (const sound of measure.sounds) {
			if (sound.tempo == null) {
				continue;
			}
			if (
				(sound.parent instanceof Direction
					? sound.parent.measureBeat
					: onsetOf(measure, sound)) !== 0
			) {
				this.values.unsupported('mid-measure tempo changes');
				continue;
			}
			if (!Number.isFinite(sound.tempo) || sound.tempo <= 0) {
				throw new Error(`Invalid tempo: ${sound.tempo}`);
			}
			result.push(sound.tempo);
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
				if (direction.measureBeat !== 0) {
					this.values.unsupported('mid-measure tempo changes');
					continue;
				}
				const duration = GuitarProValues.durations[unit.type];
				if (duration == null) {
					throw new Error(`Unsupported metronome beat unit: ${unit.type}`);
				}
				result.push(
					Number(mark.perMinute) *
						GuitarProValues.beats(duration, { dots: unit.dots }),
				);
			}
		}
		return result;
	}
	private writeStaff(part: Part, staves: MElement, id: string): void {
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
		const pitches = new GuitarProPitchWriter(part, id);
		const ctx: StaffContext = { id, tuning, capo, pitches };
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
					const beat = this.beat(lead);
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
							throw new Error('Guitar Pro chord members must share a duration');
						}
						if (!note.isRest) {
							notes.push(this.note(note, ctx).getAttribute('id')!);
						} else if (chord.notes.length !== 1) {
							throw new Error('Guitar Pro chords cannot contain rests');
						}
					}
					if (notes.length) {
						X.add(beat, 'Notes', notes.join(' '));
					}
					this.directions(beat, lead);
					cursor = onset + (lead.isGrace ? 0 : lead.beats!);
				}
				if (!chords.length) {
					beats.push(this.rhythmBeat('whole', 0).getAttribute('id')!);
				}
				X.add(voice, 'Beats', beats.join(' '));
			}
			X.add(bar, 'Voices', voices.join(' '));
		}
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
	private beat(note: Note): MElement {
		const fullRest =
			note.isRest &&
			(note.child('rest')?.getAttribute('measure') === 'yes' ||
				(note.type === 'whole' &&
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
		const beat = this.rhythmBeat(type, dots, ratio ?? undefined);
		if (note.isGrace) {
			X.add(beat, 'GraceNotes', note.graceSlash ? 'BeforeBeat' : 'OnBeat');
		}
		return beat;
	}
	private note(source: Note, staff: StaffContext): MElement {
		if (!source.pitch) {
			throw new Error(
				'Guitar Pro export requires pitched notes; percussion is not supported',
			);
		}
		const midi = GuitarProValues.midi(source.pitch);
		for (const tie of source.ties) {
			if (tie.tieType === 'let-ring') {
				this.values.unsupported('let-ring ties');
				continue;
			}
			const partner = tie.partner?.note;
			if (
				!partner?.pitch ||
				GuitarProValues.midi(partner.pitch) !== midi ||
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
		const pitch = GuitarProValues.pitch(midi, {
			flats: (source.measure.getKey(source.staff)?.fifths ?? 0) < 0,
		});
		for (const name of ['ConcertPitch', 'TransposedPitch']) {
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
		const start = source.ties.some(
			(t) => t.tieType === 'start' || t.tieType === 'continue',
		);
		const stop = source.ties.some(
			(t) => t.tieType === 'stop' || t.tieType === 'continue',
		);
		if (start || stop) {
			X.add(node, 'Tie', undefined, {
				origin: String(start),
				destination: String(stop),
			});
		}
		const accent =
			(source.articulations.includes('staccato') ? 1 : 0) |
			(source.articulations.includes('strong-accent') ? 4 : 0) |
			(source.articulations.includes('accent') ? 8 : 0);
		if (accent) {
			X.add(node, 'Accent', accent);
		}
		return node;
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
				const words = direction.words.filter(Boolean).join(' ');
				if (
					words &&
					measure === note.measure &&
					direction.measureBeat === note.measureBeat
				) {
					X.add(beat, 'FreeText', words);
				}
			}
		}
		X.add(beat, 'Dynamic', dynamic);
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
		const unsupported = new Set([
			'bend',
			'harmonic',
			'hammer-on',
			'pull-off',
			'slide',
			'glissando',
			'slur',
			'ornaments',
			'other-technical',
			'fingering',
			'pluck',
			'lyric',
			'harmony',
			'wedge',
			'pedal',
			'octave-shift',
			'ending',
			'transpose',
			'unpitched',
			'tremolo',
			'fermata',
			'arpeggiate',
			'non-arpeggiate',
			'notehead',
			'senza-misura',
			'swing',
		]);
		if (unsupported.has(element.tag)) {
			this.values.unsupported(`<${element.tag}>`);
		}
		if (element.tag === 'articulations') {
			for (const mark of element.childrenOfType(MElement)) {
				if (!['staccato', 'accent', 'strong-accent'].includes(mark.tag)) {
					this.values.unsupported(`<${mark.tag}>`);
				}
			}
		}
		const supportedChildren: Record<string, string[]> = {
			notations: ['tied', 'tuplet', 'technical', 'articulations'],
			technical: ['string', 'fret'],
			'direction-type': ['metronome', 'dynamics', 'words'],
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
