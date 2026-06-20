import type { Note } from './note';

// Notes sounding at one onset: a lead note plus its <chord/> members. A grouped
// *view* over the faithful tree, not a node. Single notes are 1-member chords.
// Every timeline query (onset, duration) reads off the lead note.
export class Chord {
  constructor(readonly notes: Note[]) {}

  // The first (non-<chord/>) note; carries the chord's onset and duration.
  get lead(): Note {
    return this.notes[0]!;
  }

  // Onset within the measure, in beats (the lead note's measureBeat()).
  measureBeat(): number | null {
    return this.lead.measureBeat();
  }
}

// Collapse <chord/> runs in `notes` into Chord groups: a non-chord note starts a
// group; each following <chord/> note joins it. Single notes are 1-member chords.
export function groupChords(notes: Note[]): Chord[] {
  const groups: Note[][] = [];
  for (const note of notes) {
    if (note.isChordMember && groups.length > 0) {
      groups[groups.length - 1]!.push(note);
    } else {
      groups.push([note]);
    }
  }
  return groups.map((members) => new Chord(members));
}
