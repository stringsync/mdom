import type { model } from '@coderline/alphatab';
import type { MDocument } from './m-document';
import type { Measure } from './measure';
import { MElement } from './m-node';
import type { Part } from './part';
import type { Note } from './note';
import { Direction } from './direction';
import { onsetOf } from './timeline';
import { groupChords } from './chord';
import { GuitarProValues } from './guitar-pro-values';
import type { GuitarProOptions } from './guitar-pro-options';

export class GuitarProScoreWriter {
  private readonly values: GuitarProValues;

  constructor(
    private readonly codec: typeof import('@coderline/alphatab'),
    opts: GuitarProOptions = {}
  ) {
    this.values = new GuitarProValues(opts);
  }

  write(document: MDocument): model.Score {
    const parts = document.score.parts;
    const first = parts[0];
    if (!first || first.measures.length === 0) {
      throw new Error('Guitar Pro export requires at least one part with measures');
    }
    this.checkAnnotations(document.score);
    const score = new this.codec.model.Score();
    score.title = document.score.title ?? '';
    const identification = document.score.child('identification');
    score.music =
      identification?.childrenNamed('creator').find((creator) => creator.getAttribute('type') === 'composer')?.text ??
      '';
    score.words =
      identification?.childrenNamed('creator').find((creator) => creator.getAttribute('type') === 'lyricist')?.text ??
      '';
    score.artist =
      identification?.childrenNamed('creator').find((creator) => creator.getAttribute('type') === 'artist')?.text ?? '';
    score.copyright = identification?.child('rights')?.text ?? '';
    for (const measure of first.measures) {
      score.addMasterBar(this.masterBar(measure));
    }
    for (const part of parts) {
      if (part.measures.length !== first.measures.length) {
        throw new Error('Guitar Pro parts must have the same number of measures');
      }
      const track = new this.codec.model.Track();
      track.name = part.label ?? '';
      const scorePart = document.score
        .child('part-list')
        ?.childrenNamed('score-part')
        .find((item) => item.getAttribute('id') === part.id);
      const instrument = scorePart?.child('midi-instrument');
      track.playbackInfo.program =
        GuitarProValues.integer(Number(instrument?.child('midi-program')?.text ?? 1), 'MIDI program', 1, 128) - 1;
      track.playbackInfo.primaryChannel =
        GuitarProValues.integer(Number(instrument?.child('midi-channel')?.text ?? 1), 'MIDI channel', 1, 16) - 1;
      track.playbackInfo.secondaryChannel = track.playbackInfo.primaryChannel;
      score.addTrack(track);
      const staffCount = part.measures[0]!.staveCount;
      GuitarProValues.integer(staffCount, 'staff count', 1, 2);
      for (const measure of part.measures) {
        if (measure.notes.some((note) => !['1', '2'].slice(0, staffCount).includes(note.staff))) {
          throw new Error('Guitar Pro notes must refer to a declared staff');
        }
        for (const attributes of measure.childrenNamed('attributes').slice(1)) {
          if (attributes.child('key') || attributes.child('time')) {
            this.values.unsupported('mid-measure key or time changes');
          }
        }
      }
      for (let index = 0; index < staffCount; index++) {
        this.writeStaff(part, track, String(index + 1));
      }
    }
    score.finish(new this.codec.Settings());
    return score;
  }

  private masterBar(measure: Measure): model.MasterBar {
    const bar = new this.codec.model.MasterBar();
    const time = measure.getTime();
    if (time && (time.components.length !== 1 || time.isSenzaMisura)) {
      throw new Error('Guitar Pro export requires a simple time signature');
    }
    bar.timeSignatureNumerator = GuitarProValues.integer(Number(time?.beats ?? 4), 'time numerator', 1, 64);
    bar.timeSignatureDenominator = GuitarProValues.integer(Number(time?.beatType ?? 4), 'time denominator', 1, 128);
    if ((bar.timeSignatureDenominator & (bar.timeSignatureDenominator - 1)) !== 0) {
      throw new Error('Guitar Pro time denominator must be a power of two');
    }
    bar.isAnacrusis = measure.isImplicit;
    bar.isRepeatStart = measure.barlines.some((line) => line.repeat === 'forward');
    const repeat = measure.barlines.find((line) => line.repeat === 'backward');
    bar.repeatCount = repeat ? GuitarProValues.integer(repeat.repeatTimes ?? 2, 'repeat count', 2, 100) : 0;
    bar.isDoubleBar = measure.barlines.some((line) => line.barStyle === 'light-light');
    for (const sound of measure.sounds) {
      if (sound.tempo != null) {
        if ((sound.parent instanceof Direction ? sound.parent.measureBeat : onsetOf(measure, sound)) !== 0) {
          this.values.unsupported('mid-measure tempo changes');
          continue;
        }
        if (!Number.isFinite(sound.tempo) || sound.tempo <= 0) {
          throw new Error(`Invalid tempo: ${sound.tempo}`);
        }
        bar.tempoAutomations.push(this.codec.model.Automation.buildTempoAutomation(false, 0, sound.tempo, 2));
      }
    }
    for (const direction of measure.directions) {
      if (direction.sound?.tempo != null) {
        continue;
      }
      for (const metronome of direction.metronomes) {
        const unit = metronome.beatUnits[0];
        if (
          !unit ||
          metronome.beatUnits.length !== 1 ||
          !Number.isFinite(Number(metronome.perMinute)) ||
          Number(metronome.perMinute) <= 0
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
        const tempo = Number(metronome.perMinute) * GuitarProValues.beats(duration, { dots: unit.dots });
        bar.tempoAutomations.push(this.codec.model.Automation.buildTempoAutomation(false, 0, tempo, 2));
      }
    }
    return bar;
  }

  private writeStaff(part: Part, track: model.Track, staffId: string): void {
    const staff = new this.codec.model.Staff();
    const first = part.measures[0]!;
    const tunings = first.getStaffTunings(staffId).toSorted((a, b) => b.line - a.line);
    staff.stringTuning.tunings = tunings.map((tuning) => GuitarProValues.integer(tuning.midi, 'tuning pitch', 0, 127));
    if (tunings.some((tuning, index) => tuning.line !== tunings.length - index)) {
      throw new Error('Guitar Pro tuning lines must be consecutive starting at 1');
    }
    staff.capo = GuitarProValues.integer(first.getStaffDetails(staffId)?.capo ?? 0, 'capo', 0, 36);
    staff.showTablature = tunings.length > 0;
    staff.showStandardNotation = true;
    track.addStaff(staff);
    const voiceIds = [
      ...new Set(
        part.measures.flatMap((measure) =>
          measure.notes.filter((note) => note.staff === staffId).map((note) => note.voice)
        )
      ),
    ];
    if (voiceIds.length > 4) {
      throw new Error('Guitar Pro supports at most four voices per staff');
    }
    if (voiceIds.length === 0) {
      voiceIds.push('1');
    }
    for (const measure of part.measures) {
      const master = track.score.masterBars[measure.index]!;
      const own = this.masterBar(measure);
      if (
        own.timeSignatureNumerator !== master.timeSignatureNumerator ||
        own.timeSignatureDenominator !== master.timeSignatureDenominator ||
        own.isAnacrusis !== master.isAnacrusis ||
        own.isRepeatStart !== master.isRepeatStart ||
        own.repeatCount !== master.repeatCount
      ) {
        throw new Error('Guitar Pro requires matching meter, pickups and repeats across parts');
      }
      if (
        own.tempoAutomations.length > 0 &&
        track.index > 0 &&
        JSON.stringify(own.tempoAutomations.map((a) => a.value)) !==
          JSON.stringify(master.tempoAutomations.map((a) => a.value))
      ) {
        throw new Error('Guitar Pro requires matching tempo changes across parts');
      }
      const currentTuning = measure
        .getStaffTunings(staffId)
        .toSorted((a, b) => b.line - a.line)
        .map((tuning) => tuning.midi);
      if (
        JSON.stringify(currentTuning) !== JSON.stringify(staff.tuning) ||
        (measure.getStaffDetails(staffId)?.capo ?? 0) !== staff.capo
      ) {
        throw new Error('Guitar Pro export does not support mid-score tuning or capo changes');
      }
      if (measure.staveCount !== first.staveCount) {
        throw new Error('Guitar Pro export does not support changing the staff count');
      }
      if (measure.clefChanges(staffId).length > 0) {
        this.values.unsupported('mid-measure clef changes');
      }
      const bar = new this.codec.model.Bar();
      bar.clef = this.clef(measure, staffId);
      bar.keySignature = GuitarProValues.integer(measure.getKey(staffId)?.fifths ?? 0, 'key fifths', -7, 7);
      const mode = measure.getKey(staffId)?.mode;
      if (mode && mode !== 'major' && mode !== 'minor') {
        this.values.unsupported(`key mode ${mode}`);
      }
      bar.keySignatureType =
        mode === 'minor' ? this.codec.model.KeySignatureType.Minor : this.codec.model.KeySignatureType.Major;
      staff.addBar(bar);
      for (const voiceId of voiceIds) {
        const voice = new this.codec.model.Voice();
        bar.addVoice(voice);
        const chords = groupChords(measure.notes.filter((note) => note.staff === staffId && note.voice === voiceId));
        let cursor = 0;
        for (const chord of chords) {
          const lead = chord.lead;
          const onset = lead.measureBeat;
          if (onset == null || !Number.isFinite(onset) || onset < cursor - 1e-8) {
            throw new Error(`Overlapping or invalid note timing in measure ${measure.number}`);
          }
          this.addRests(voice, onset - cursor);
          const beat = this.beat(lead);
          voice.addBeat(beat);
          for (const note of chord.notes) {
            if (
              note.beats !== lead.beats ||
              note.isGrace !== lead.isGrace ||
              note.type !== lead.type ||
              note.dots !== lead.dots ||
              JSON.stringify(note.timeModification) !== JSON.stringify(lead.timeModification)
            ) {
              throw new Error('Guitar Pro chord members must share a duration');
            }
            if (!note.isRest) {
              beat.addNote(this.note(note, staff));
            } else if (chord.notes.length !== 1) {
              throw new Error('Guitar Pro chords cannot contain rests');
            }
          }
          this.directions(beat, lead);
          cursor = onset + (lead.isGrace ? 0 : lead.beats!);
        }
        if (chords.length === 0) {
          const rest = new this.codec.model.Beat();
          rest.duration = this.codec.model.Duration.Whole;
          voice.addBeat(rest);
        }
      }
    }
  }

  private clef(measure: Measure, staff: string): model.Clef {
    const clef = measure.getClef(staff);
    if (!clef || clef.sign === 'TAB') {
      return this.codec.model.Clef.G2;
    }
    if (clef.octaveChange) {
      this.values.unsupported('octave clefs');
    }
    const result = new Map([
      ['G2', this.codec.model.Clef.G2],
      ['F4', this.codec.model.Clef.F4],
      ['C3', this.codec.model.Clef.C3],
      ['C4', this.codec.model.Clef.C4],
    ]).get(`${clef.sign}${clef.line}`);
    if (result == null) {
      throw new Error(`Unsupported Guitar Pro clef: ${clef.sign}${clef.line}`);
    }
    return result;
  }

  private beat(note: Note): model.Beat {
    const beat = new this.codec.model.Beat();
    const fullRest =
      note.isRest &&
      (note.child('rest')?.getAttribute('measure') === 'yes' ||
        (note.type === 'whole' &&
          note.measure.notes.filter((sibling) => sibling.voice === note.voice && sibling.staff === note.staff)
            .length === 1));
    const duration = fullRest ? this.codec.model.Duration.Whole : GuitarProValues.durations[note.type ?? ''];
    if (duration == null) {
      throw new Error(`Guitar Pro export requires a supported note type, got ${note.type}`);
    }
    beat.duration = duration;
    beat.dots = GuitarProValues.integer(note.dots, 'augmentation dots', 0, 3);
    const ratio = note.timeModification;
    if (ratio) {
      beat.tupletNumerator = GuitarProValues.integer(ratio.actual, 'tuplet numerator', 1, 64);
      beat.tupletDenominator = GuitarProValues.integer(ratio.normal, 'tuplet denominator', 1, 64);
    }
    if (note.isGrace) {
      beat.graceType = note.graceSlash ? this.codec.model.GraceType.BeforeBeat : this.codec.model.GraceType.OnBeat;
    } else {
      const expected = fullRest
        ? (Number(note.measure.getTime()?.beats ?? 4) * 4) / Number(note.measure.getTime()?.beatType ?? 4)
        : GuitarProValues.beats(duration, { dots: beat.dots, actual: ratio?.actual, normal: ratio?.normal });
      if (note.beats == null || !Number.isFinite(note.beats) || Math.abs(note.beats - expected) > 1e-8) {
        throw new Error(`Note duration disagrees with its notation in measure ${note.measure.number}`);
      }
    }
    return beat;
  }

  private note(source: Note, staff: model.Staff): model.Note {
    if (!source.pitch) {
      throw new Error('Guitar Pro export requires pitched notes; percussion is not supported');
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
        throw new Error('Guitar Pro ties must connect matching pitches in the same voice and staff');
      }
    }
    const note = new this.codec.model.Note();
    note.octave = Math.floor(midi / 12);
    note.tone = midi % 12;
    if (source.string != null || source.fret != null) {
      if (staff.tuning.length === 0 || source.string == null || source.fret == null) {
        throw new Error('Guitar Pro tablature requires tuning, string and fret');
      }
      GuitarProValues.integer(source.string, 'string', 1, staff.tuning.length);
      note.string = staff.tuning.length - source.string + 1;
      note.fret = GuitarProValues.integer(source.fret, 'fret', 0, 99);
      if (staff.tuning[source.string - 1]! + staff.capo + note.fret !== midi) {
        throw new Error('Note pitch disagrees with its string, fret and capo');
      }
    } else if (staff.tuning.length > 0) {
      throw new Error('Every pitched note on a Guitar Pro tablature staff needs a string and fret');
    }
    note.isTieDestination =
      source.ties.some((tie) => tie.tieType === 'stop' || tie.tieType === 'continue') ||
      source.childrenNamed('tie').some((tie) => tie.getAttribute('type') === 'stop');
    note.isStaccato = source.articulations.includes('staccato');
    note.accentuated = source.articulations.includes('strong-accent')
      ? this.codec.model.AccentuationType.Heavy
      : source.articulations.includes('accent')
        ? this.codec.model.AccentuationType.Normal
        : this.codec.model.AccentuationType.None;
    return note;
  }

  private directions(beat: model.Beat, note: Note): void {
    const directions = note.part.measures
      .slice(0, note.measure.index + 1)
      .flatMap((measure) =>
        measure.directions.filter(
          (direction) =>
            direction.staff === note.staff &&
            (measure.index < note.measure.index || (direction.measureBeat ?? 0) <= note.measureBeat!)
        )
      );
    for (const direction of directions) {
      if (direction.staff !== note.staff) {
        continue;
      }
      for (const dynamic of direction.dynamics.flatMap((mark) => mark.marks)) {
        const value = this.codec.model.DynamicValue[dynamic.toUpperCase() as keyof typeof model.DynamicValue];
        if (typeof value !== 'number') {
          this.values.unsupported(`dynamic ${dynamic}`);
        } else {
          beat.dynamics = value;
        }
      }
      const words = direction.words.filter(Boolean).join(' ');
      if (words && direction.parent === note.measure && direction.measureBeat === note.measureBeat) {
        beat.text = words;
      }
    }
  }

  private addRests(voice: model.Voice, gap: number): void {
    let remaining = gap;
    for (const duration of Object.values(GuitarProValues.durations)) {
      const beats = 4 / duration;
      while (remaining >= beats - 1e-8) {
        const rest = new this.codec.model.Beat();
        rest.duration = duration;
        voice.addBeat(rest);
        remaining -= beats;
      }
    }
    if (Math.abs(remaining) > 1e-8) {
      throw new Error('Guitar Pro export cannot represent this gap with ordinary rests');
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
