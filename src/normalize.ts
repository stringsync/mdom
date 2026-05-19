import type { Element } from 'xml-js';
import { Document } from './nodes/document';
import { Entry, type EntryKind } from './nodes/entry';
import { Measure } from './nodes/measure';
import { type Note, pitch, type Step } from './nodes/note';
import { Part } from './nodes/part';
import { Stave } from './nodes/stave';
import { Voice } from './nodes/voice';

// spec(mdom.hierarchy): both MusicXML flavors normalize into one timewise
// hierarchy — Document -> Measure -> Part -> Stave -> Voice -> Entry — so
// callers never branch on score-partwise vs score-timewise.

function children(el: Element | undefined, name: string): Element[] {
  return el?.elements?.filter((child) => child.name === name) ?? [];
}

function child(el: Element | undefined, name: string): Element | undefined {
  return el?.elements?.find((c) => c.name === name);
}

function has(el: Element, name: string): boolean {
  return child(el, name) !== undefined;
}

function text(el: Element | undefined): string | undefined {
  return el?.elements?.find((c) => c.type === 'text')?.text?.toString();
}

function num(el: Element | undefined, fallback: number): number {
  const value = text(el);
  return value === undefined ? fallback : Number(value);
}

// spec(mdom.hierarchy): a Part has many Staves (a staff line); a Stave has many
// Voices (independent rhythmic streams). Staves are ordered by staff number; a
// stave's voices by first appearance in the note stream.
function buildPart(notes: Element[]): Part {
  type Draft = { kind: EntryKind; notes: Note[] };
  // staffNumber -> voiceNumber -> ordered entry drafts
  const staves = new Map<number, Map<string, Draft[]>>();

  for (const note of notes) {
    const staff = num(child(note, 'staff'), 1);
    const voice = text(child(note, 'voice')) ?? '1';
    const voices = staves.get(staff) ?? new Map<string, Draft[]>();
    staves.set(staff, voices);
    const drafts = voices.get(voice) ?? [];
    voices.set(voice, drafts);

    const rest = has(note, 'rest');
    const parsed = parseNote(note);

    // spec(mdom.entries): a chord is one Entry with multiple Notes — the
    // per-note <chord/> flag folds into the preceding entry.
    if (has(note, 'chord') && drafts.length > 0) {
      const last = drafts[drafts.length - 1]!;
      if (parsed) {
        last.notes.push(parsed);
      }
      last.kind = 'chord';
      continue;
    }

    drafts.push({ kind: rest ? 'rest' : 'note', notes: parsed ? [parsed] : [] });
  }

  const staveNodes = [...staves.keys()]
    .sort((a, b) => a - b)
    .map((staff) => {
      const voiceNodes = [...staves.get(staff)!.values()].map(
        (drafts) => new Voice(drafts.map((d) => new Entry(d.kind, d.notes)))
      );
      return new Stave(voiceNodes);
    });
  return new Part(staveNodes);
}

// spec(mdom.entries): note.pitch is resolved (step/octave/alter + derived
// midi/name); a rest yields no Note.
function parseNote(note: Element): Note | undefined {
  const pitchEl = child(note, 'pitch');
  if (!pitchEl) {
    return undefined;
  }
  const step = (text(child(pitchEl, 'step')) ?? 'C') as Step;
  const octave = num(child(pitchEl, 'octave'), 4);
  const alter = num(child(pitchEl, 'alter'), 0);
  return { pitch: pitch(step, octave, alter) };
}

// spec(mdom.hierarchy): a Measure is a timewise slice across all parts. The
// part-list fixes part order; partwise transposes part->measure into the
// timewise measure->part the model exposes.
export function normalize(root: Element): Document {
  const partList = child(root, 'part-list');
  const partIds = children(partList, 'score-part').map((p) => p.attributes?.id?.toString() ?? '');

  // One slice per measure index: partId -> the part's <note> elements.
  const measures: Map<string, Element[]>[] = [];
  const slice = (index: number): Map<string, Element[]> => {
    return (measures[index] ??= new Map<string, Element[]>());
  };

  if (root.name === 'score-partwise') {
    for (const part of children(root, 'part')) {
      const id = part.attributes?.id?.toString() ?? '';
      children(part, 'measure').forEach((measure, index) => {
        slice(index).set(id, children(measure, 'note'));
      });
    }
  } else {
    children(root, 'measure').forEach((measure, index) => {
      slice(index);
      for (const part of children(measure, 'part')) {
        const id = part.attributes?.id?.toString() ?? '';
        slice(index).set(id, children(part, 'note'));
      }
    });
  }

  const measureNodes = [...measures].map(
    (byPart) => new Measure(partIds.map((id) => buildPart(byPart?.get(id) ?? [])))
  );
  return new Document(measureNodes);
}
