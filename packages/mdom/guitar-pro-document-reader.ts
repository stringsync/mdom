import type { model } from '@coderline/alphatab';
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProValues } from './guitar-pro-values';
import { MDocument } from './m-document';
import { MElement } from './m-node';
import { appendValue, type Measure } from './measure';
import { buildPitch, Note } from './note';
import { StaffDetails } from './staff-details';
import { StaffTuning } from './staff-tuning';
import { Tie } from './tie';

export class GuitarProDocumentReader {
	private readonly values: GuitarProValues;

	constructor(
		private readonly codec: typeof import('@coderline/alphatab'),
		opts: GuitarProOptions = {},
	) {
		this.values = new GuitarProValues(opts);
	}

	read(score: model.Score): MDocument {
		if (score.tracks.length === 0 || score.masterBars.length === 0) {
			throw new Error(
				'Guitar Pro score must have at least one track and measure',
			);
		}
		if (score.backingTrack) {
			this.values.unsupported('embedded audio');
		}
		const doc = MDocument.empty();
		if (score.title) {
			appendValue(doc.score, 'movement-title', score.title);
		}
		const identification = new MElement('identification');
		for (const [type, text] of [
			['composer', score.music],
			['lyricist', score.words],
			['artist', score.artist],
		]) {
			if (text) {
				appendValue(identification, 'creator', text).setAttribute(
					'type',
					type!,
				);
			}
		}
		if (score.copyright) {
			appendValue(identification, 'rights', score.copyright);
		}
		doc.score.append(identification);
		for (const track of score.tracks) {
			if (track.isPercussion) {
				throw new Error('Guitar Pro percussion tracks are not supported');
			}
			const part = doc.score.addPart({ name: track.name });
			const scorePart = doc.score
				.child('part-list')!
				.childrenNamed('score-part')
				.at(-1)!;
			const instrument = new MElement('score-instrument');
			instrument.setAttribute('id', `${part.id}-I1`);
			appendValue(instrument, 'instrument-name', track.name || 'Instrument');
			scorePart.append(instrument);
			const midi = new MElement('midi-instrument');
			midi.setAttribute('id', `${part.id}-I1`);
			appendValue(
				midi,
				'midi-channel',
				String(track.playbackInfo.primaryChannel + 1),
			);
			appendValue(midi, 'midi-program', String(track.playbackInfo.program + 1));
			scorePart.append(midi);
			for (const master of score.masterBars) {
				const measure = part.addMeasure();
				this.readMaster(master, measure);
				measure.setStaveCount(track.staves.length);
				measure.setDivisions(this.divisions(track, master.index));
				let cursor = 0;
				for (const staff of track.staves) {
					const bar = staff.bars[master.index];
					if (!bar) {
						throw new Error(
							`Missing Guitar Pro bar ${master.index + 1} in ${track.name}`,
						);
					}
					this.readStaff(staff, bar, measure);
					for (const voice of bar.voices) {
						const beats =
							voice.index === 0
								? voice.beats
								: voice.beats.filter((beat) => !beat.isEmpty);
						if (beats.length === 0) {
							continue;
						}
						if (cursor > 0) {
							const backup = new MElement('backup');
							appendValue(backup, 'duration', String(cursor));
							measure.append(backup);
						}
						cursor = 0;
						for (const beat of beats) {
							cursor += this.readBeat(
								beat,
								measure,
								`${staff.index * 4 + voice.index + 1}`,
							);
						}
					}
				}
				if (master.isRepeatEnd || master.isDoubleBar) {
					measure.addBarline({
						barStyle: master.isRepeatEnd ? 'light-heavy' : 'light-light',
						repeat: master.isRepeatEnd
							? { direction: 'backward', times: master.repeatCount }
							: undefined,
					});
				}
			}
		}
		return doc;
	}

	private readMaster(master: model.MasterBar, measure: Measure): void {
		GuitarProValues.integer(
			master.timeSignatureNumerator,
			'time numerator',
			1,
			64,
		);
		GuitarProValues.integer(
			master.timeSignatureDenominator,
			'time denominator',
			1,
			128,
		);
		measure.setTime({
			beats: master.timeSignatureNumerator,
			beatType: master.timeSignatureDenominator,
		});
		if (master.isAnacrusis) {
			measure.setAttribute('implicit', 'yes');
		}
		if (master.isRepeatStart) {
			measure.addBarline({
				location: 'left',
				repeat: { direction: 'forward' },
			});
		}
		if (
			master.alternateEndings ||
			master.directions?.size ||
			master.isFreeTime ||
			master.tripletFeel
		) {
			this.values.unsupported('alternate endings, jumps, free time or swing');
		}
		for (const tempo of master.tempoAutomations) {
			if (tempo.ratioPosition !== 0 || tempo.isLinear) {
				this.values.unsupported('mid-measure or gradual tempo changes');
				continue;
			}
			measure.addDirection({
				metronome: { beatUnit: 'quarter', perMinute: tempo.value },
				tempo: tempo.value,
			});
		}
	}

	private readStaff(
		staff: model.Staff,
		bar: model.Bar,
		measure: Measure,
	): void {
		const staffId = String(staff.index + 1);
		if (
			staff.transpositionPitch ||
			bar.clefOttava !== this.codec.model.Ottavia.Regular
		) {
			this.values.unsupported('transposing instruments or octave clefs');
		}
		const clefs: Record<number, { sign: string; line: number }> = {
			[this.codec.model.Clef.G2]: { sign: 'G', line: 2 },
			[this.codec.model.Clef.F4]: { sign: 'F', line: 4 },
			[this.codec.model.Clef.C3]: { sign: 'C', line: 3 },
			[this.codec.model.Clef.C4]: { sign: 'C', line: 4 },
		};
		const clef = clefs[bar.clef];
		if (!clef) {
			throw new Error(`Unsupported Guitar Pro clef: ${bar.clef}`);
		}
		measure.setKey({
			fifths: bar.keySignature,
			mode:
				bar.keySignatureType === this.codec.model.KeySignatureType.Minor
					? 'minor'
					: 'major',
			staff: staffId,
		});
		measure.setClef({ ...clef, staff: staffId });
		if (measure.index === 0 && staff.showTablature && staff.tuning.length > 0) {
			const details = new StaffDetails();
			details.setAttribute('number', staffId);
			appendValue(details, 'staff-lines', String(staff.tuning.length));
			for (const [index, midi] of staff.tuning.toReversed().entries()) {
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

	/** A grace note takes no time, a full-bar rest takes the bar, everything else takes its own value. */
	private beatDuration(
		beat: model.Beat,
		fullRest: boolean,
		divisions: number,
	): number {
		if (beat.graceType !== this.codec.model.GraceType.None) {
			return 0;
		}
		if (fullRest) {
			return (beat.voice.bar.masterBar.calculateDuration() / 960) * divisions;
		}
		return (
			GuitarProValues.beats(beat.duration, {
				dots: beat.dots,
				actual: beat.hasTuplet ? beat.tupletNumerator : 1,
				normal: beat.hasTuplet ? beat.tupletDenominator : 1,
			}) * divisions
		);
	}

	private readBeat(beat: model.Beat, measure: Measure, voice: string): number {
		const staff = beat.voice.bar.staff;
		const divisions = Number(
			measure.child('attributes')!.child('divisions')!.text,
		);
		const type = GuitarProValues.noteType(beat.duration);
		const fullRest = beat.isEmpty || beat.isFullBarRest;
		const duration = this.beatDuration(beat, fullRest, divisions);
		if (!Number.isInteger(duration)) {
			throw new Error(
				`Cannot represent Guitar Pro duration in measure ${measure.number}`,
			);
		}
		if (
			beat.hasWhammyBar ||
			beat.vibrato ||
			beat.fade ||
			beat.pickStroke ||
			beat.brushType ||
			beat.hasChord ||
			beat.lyrics?.length ||
			beat.isLegatoOrigin ||
			beat.ottava !== this.codec.model.Ottavia.Regular ||
			beat.isTremolo ||
			beat.pop ||
			beat.slap ||
			beat.tap ||
			beat.crescendo ||
			beat.isPalmMute ||
			beat.isLetRing ||
			beat.fermata
		) {
			this.values.unsupported(
				`beat effects or annotations in measure ${measure.number}`,
			);
		}
		const dynamic = this.codec.model.DynamicValue[beat.dynamics]?.toLowerCase();
		if (dynamic && beat.graceType === this.codec.model.GraceType.None) {
			measure.addDirection({
				dynamics: dynamic,
				staff: String(staff.index + 1),
			});
		}
		if (beat.text) {
			measure.addDirection({
				words: beat.text,
				staff: String(staff.index + 1),
			});
		}
		const notes = beat.isRest ? [null] : beat.notes;
		for (const [index, source] of notes.entries()) {
			const note = new Note();
			if (beat.graceType !== this.codec.model.GraceType.None) {
				const grace = new MElement('grace');
				if (beat.graceType === this.codec.model.GraceType.BeforeBeat) {
					grace.setAttribute('slash', 'yes');
				}
				note.append(grace);
			}
			if (index > 0) {
				note.append(new MElement('chord'));
			}
			if (source) {
				note.append(
					buildPitch(
						GuitarProValues.pitch(source.realValueWithoutHarmonic, {
							flats: beat.voice.bar.keySignature < 0,
						}),
					),
				);
			} else {
				const rest = new MElement('rest');
				if (fullRest) {
					rest.setAttribute('measure', 'yes');
				}
				note.append(rest);
			}
			if (duration > 0) {
				appendValue(note, 'duration', String(duration));
			}
			appendValue(note, 'voice', voice);
			if (!fullRest) {
				appendValue(note, 'type', type);
				for (let dot = 0; dot < beat.dots; dot++) {
					note.append(new MElement('dot'));
				}
			}
			if (beat.hasTuplet) {
				const ratio = new MElement('time-modification');
				appendValue(ratio, 'actual-notes', String(beat.tupletNumerator));
				appendValue(ratio, 'normal-notes', String(beat.tupletDenominator));
				note.append(ratio);
			}
			appendValue(note, 'staff', String(staff.index + 1));
			if (source) {
				this.readNote(source, note, staff);
			}
			measure.append(note);
		}
		return duration;
	}

	private readNote(source: model.Note, note: Note, staff: model.Staff): void {
		if (
			source.hasBend ||
			source.isHarmonic ||
			source.isHammerPullOrigin ||
			source.slideInType ||
			source.slideOutType ||
			source.vibrato ||
			source.isPalmMute ||
			source.isLetRing ||
			source.isDead ||
			source.isGhost ||
			source.isTrill ||
			source.isSlurOrigin ||
			source.isFingering ||
			source.ornament ||
			source.isLeftHandTapped
		) {
			this.values.unsupported('note techniques');
		}
		if (source.isStringed && staff.showTablature) {
			note.setStringFret({
				string: staff.tuning.length - source.string + 1,
				fret: source.fret,
			});
		}
		if (source.isStaccato) {
			note.addArticulation('staccato');
		}
		if (source.accentuated !== this.codec.model.AccentuationType.None) {
			note.addArticulation(
				source.accentuated === this.codec.model.AccentuationType.Heavy
					? 'strong-accent'
					: 'accent',
			);
		}
		for (const type of ['stop', 'start'] as const) {
			if (type === 'stop' ? source.isTieDestination : source.isTieOrigin) {
				const sound = new MElement('tie');
				sound.setAttribute('type', type);
				note.insertBefore(sound, note.child('voice'));
				let notations = note.child('notations');
				if (!notations) {
					notations = new MElement('notations');
					note.append(notations);
				}
				const tied = new Tie();
				tied.setAttribute('type', type);
				notations.append(tied);
			}
		}
	}

	private divisions(track: model.Track, index: number): number {
		let divisions = 256;
		for (const staff of track.staves) {
			for (const voice of staff.bars[index]?.voices ?? []) {
				for (const beat of voice.beats) {
					if (beat.hasTuplet) {
						let a = divisions;
						let b = beat.tupletNumerator;
						while (b !== 0) {
							[a, b] = [b, a % b];
						}
						divisions = (divisions / a) * beat.tupletNumerator;
						if (!Number.isSafeInteger(divisions) || divisions > 100_000_000) {
							throw new Error(
								'Guitar Pro tuplet ratios require too many divisions',
							);
						}
					}
				}
			}
		}
		return divisions;
	}
}
