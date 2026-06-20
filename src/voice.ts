import { MElement } from './m-node';
import { Note } from './note';
import { Pitch } from './pitch';
import { Chord, groupChords } from './chord';
import { attributesOf, appendValue, type Measure } from './measure';
import { onsetOf, writeCursor } from './timeline';
import { divisionsBackFrom } from './signature';

// MusicXML note-type values, coarsest to finest.
export type NoteType = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th' | '128th';

export interface DurationSpec {
  type: NoteType;
  dots?: number;
  // Beat within the measure to place this at; defaults to the voice's own cursor
  // (the end of its last note). Pass it to jump back and stack, or leave a gap.
  onset?: number;
}

export interface PitchSpec {
  step: string;
  octave: number;
  alter?: number;
}

export type NoteSpec = PitchSpec & DurationSpec;

// Quarter-note beats per note type; dots add half of the previous increment.
const QUARTER_BEATS: Record<NoteType, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  '16th': 0.25,
  '32nd': 0.125,
  '64th': 0.0625,
  '128th': 0.03125,
};

// Fixed divisions mdom writes (PPQ). 2^8 makes every note type (down to 128th)
// and up to triple dots land on an integer <duration>; bump to a multiple of 3
// when tuplet writing arrives. ponytail: one constant beats adaptive rescaling.
const WRITE_DIVISIONS = 256;

// A single <voice> within a measure — read and write. Reading: `notes` is the
// live slice for this voice and `chords()` groups its <chord/> stacks. Writing:
// note/rest/chord append on this voice's staff, and mdom lays out the
// <backup>/<forward>, <duration>, <voice>, and <staff> so the caller never does.
export class Voice {
  constructor(
    readonly measure: Measure,
    readonly id: string,
    readonly staff: string = '1'
  ) {}

  get notes(): Note[] {
    return this.measure.notes.filter((note) => (note.voice ?? '1') === this.id);
  }

  chords(): Chord[] {
    return groupChords(this.notes);
  }

  // Append a pitched note. Follows this voice's cursor unless `onset` is given.
  note(spec: NoteSpec): Note {
    const duration = this.open(spec);
    const note = this.build(spec, duration, spec, false);
    this.measure.append(note);
    return note;
  }

  // Append a rest.
  rest(spec: DurationSpec): Note {
    const duration = this.open(spec);
    const note = this.build(spec, duration, null, false);
    this.measure.append(note);
    return note;
  }

  // Append a chord: several pitches sharing one onset and duration. The first
  // pitch is the lead; the rest get <chord/> so they stack on its onset.
  chord(pitches: PitchSpec[], spec: DurationSpec): Chord {
    const duration = this.open(spec);
    const notes = pitches.map((pitch, index) => {
      const note = this.build(spec, duration, pitch, index > 0);
      this.measure.append(note);
      return note;
    });
    return new Chord(notes);
  }

  // Ensure divisions exist, compute this entry's duration, and move the write
  // cursor to its onset (inserting <backup>/<forward>). Returns the duration.
  private open(spec: DurationSpec): number {
    const divisions = this.divisions();
    const duration = durationDivisions(spec, divisions);
    const target = spec.onset != null ? spec.onset * divisions : voiceEnd(this.measure, this.id);
    this.align(target);
    return duration;
  }

  // Insert a <backup> or <forward> so the next appended note sounds at `target`
  // (in divisions). Nothing when the cursor is already there.
  private align(target: number): void {
    const delta = target - writeCursor(this.measure);
    if (delta === 0) {
      return;
    }
    const mover = new MElement(delta > 0 ? 'forward' : 'backup');
    appendValue(mover, 'duration', String(Math.abs(delta)));
    this.measure.append(mover);
  }

  // Build one <note> with its children in MusicXML order: chord, pitch/rest,
  // duration, voice, type, dots, staff.
  private build(spec: DurationSpec, duration: number, pitch: PitchSpec | null, isChord: boolean): Note {
    const note = new Note();
    if (isChord) {
      note.append(new MElement('chord'));
    }
    if (pitch) {
      note.append(buildPitch(pitch));
    } else {
      note.append(new MElement('rest'));
    }
    appendValue(note, 'duration', String(duration));
    appendValue(note, 'voice', this.id);
    appendValue(note, 'type', spec.type);
    for (let dot = 0; dot < (spec.dots ?? 0); dot++) {
      note.append(new MElement('dot'));
    }
    if (this.staff !== '1') {
      appendValue(note, 'staff', this.staff);
    }
    return note;
  }

  // Divisions in effect, or the fixed write value installed into <attributes>.
  private divisions(): number {
    const existing = divisionsBackFrom(this.measure, this.measure.children.length);
    if (existing != null) {
      return existing;
    }
    appendValue(attributesOf(this.measure), 'divisions', String(WRITE_DIVISIONS));
    return WRITE_DIVISIONS;
  }
}

// <duration> in divisions for a musical type + dots. <duration> must be an
// integer; with WRITE_DIVISIONS this holds for every type down to a 128th with
// up to triple dots. Anything finer throws loudly rather than emit invalid XML.
function durationDivisions(spec: DurationSpec, divisions: number): number {
  let increment = QUARTER_BEATS[spec.type] * divisions;
  let total = increment;
  for (let dot = 0; dot < (spec.dots ?? 0); dot++) {
    increment /= 2;
    total += increment;
  }
  if (!Number.isInteger(total)) {
    throw new Error(
      `cannot represent ${spec.dots ?? 0}-dotted "${spec.type}" at divisions ${divisions}: fractional duration ${total}`
    );
  }
  return total;
}

function buildPitch(spec: PitchSpec): Pitch {
  const pitch = new Pitch();
  appendValue(pitch, 'step', spec.step);
  if (spec.alter != null) {
    appendValue(pitch, 'alter', String(spec.alter));
  }
  appendValue(pitch, 'octave', String(spec.octave));
  return pitch;
}

// Divisions elapsed at the end of the voice's last non-chord note — where the
// next note in this voice lands by default (0 for an empty voice).
function voiceEnd(measure: Measure, voiceId: string): number {
  let end = 0;
  for (const note of measure.notes) {
    if ((note.voice ?? '1') !== voiceId || note.child('chord') !== null) {
      continue;
    }
    const onset = onsetOf(measure, note);
    if (onset != null) {
      end = onset + (note.duration ?? 0);
    }
  }
  return end;
}
