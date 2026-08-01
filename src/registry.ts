import { MElement, MText, MCData, type MNode } from './m-node';
import { Accidental } from './accidental';
import { Barline } from './barline';
import { Beam } from './beam';
import { Bracket } from './bracket';
import { Clef } from './clef';
import { Dashes } from './dashes';
import { Direction } from './direction';
import { Dynamics } from './dynamics';
import { Figure, FiguredBass } from './figured-bass';
import { Frame, FrameNote } from './frame';
import { Glissando } from './glissando';
import { HammerOn } from './hammer-on';
import { Harmony } from './harmony';
import { Key } from './key';
import { LineDetail } from './line-detail';
import { Lyric } from './lyric';
import { Measure } from './measure';
import { Metronome, MetronomeNote } from './metronome';
import { Note } from './note';
import { OctaveShift } from './octave-shift';
import { Ornament, ORNAMENT_TAGS } from './ornament';
import { Part } from './part';
import { Pedal } from './pedal';
import { Pitch } from './pitch';
import { Print } from './print';
import { PullOff } from './pull-off';
import { Rehearsal } from './rehearsal';
import { Score } from './score';
import { Slide } from './slide';
import { Slur } from './slur';
import { Sound } from './sound';
import { StaffTuning } from './staff-tuning';
import { SystemLayout } from './system-layout';
import { Technical, TECHNICAL_TAGS } from './technical';
import { Tie } from './tie';
import { Time } from './time';
import { Tuplet } from './tuplet';
import { WavyLine } from './wavy-line';
import { Wedge } from './wedge';
import { Words } from './words';

/**
 * Tag -> typed node. Classes with a fixed tag take no constructor argument;
 * {@link Ornament} and {@link Technical} stand in for a whole family of tags, so
 * the tag is passed in — which is why the map's value type takes one.
 */
type ElementCtor = new (tag: string) => MElement;

let registry: Record<string, ElementCtor> | null = null;

/**
 * The tag map, built on first use rather than at module load: the element modules
 * import each other, so a top-level literal would read a class binding that is
 * still being initialized.
 */
function tags(): Record<string, ElementCtor> {
  if (registry) {
    return registry;
  }
  registry = {
    'score-partwise': Score,
    part: Part,
    measure: Measure,
    note: Note,
    pitch: Pitch,
    accidental: Accidental,
    lyric: Lyric,
    barline: Barline,
    clef: Clef,
    slur: Slur,
    key: Key,
    time: Time,
    tied: Tie,
    beam: Beam,
    tuplet: Tuplet,
    'wavy-line': WavyLine,
    wedge: Wedge,
    pedal: Pedal,
    'octave-shift': OctaveShift,
    bracket: Bracket,
    dashes: Dashes,
    direction: Direction,
    dynamics: Dynamics,
    rehearsal: Rehearsal,
    words: Words,
    metronome: Metronome,
    'metronome-note': MetronomeNote,
    sound: Sound,
    'figured-bass': FiguredBass,
    figure: Figure,
    'staff-tuning': StaffTuning,
    frame: Frame,
    'frame-note': FrameNote,
    harmony: Harmony,
    'hammer-on': HammerOn,
    'pull-off': PullOff,
    slide: Slide,
    glissando: Glissando,
    'line-detail': LineDetail,
    print: Print,
    'system-layout': SystemLayout,
  };
  for (const tag of ORNAMENT_TAGS) {
    registry[tag] = Ornament;
  }
  for (const tag of TECHNICAL_TAGS) {
    registry[tag] = Technical;
  }
  return registry;
}

/**
 * A fresh element for `tag`: the typed node when the tag is modeled, else a plain
 * {@link MElement} (which still round-trips). The single place tags become
 * classes — the parser builds with it, and so does {@link cloneNode}, so a copied
 * subtree answers the same typed queries the parsed one does.
 */
export function elementFor(tag: string): MElement {
  const Ctor = tags()[tag];
  return Ctor ? new Ctor(tag) : new MElement(tag);
}

/** A deep copy of `node`, detached from any parent, with the same typed classes. */
export function cloneNode(node: MNode): MNode {
  if (node instanceof MText) {
    return new MText(node.value);
  }
  if (node instanceof MCData) {
    return new MCData(node.value);
  }
  const element = node as MElement;
  const copy = elementFor(element.tag);
  for (const [name, value] of Object.entries(element.attributes)) {
    copy.setAttribute(name, value);
  }
  for (const child of element.children) {
    copy.append(cloneNode(child));
  }
  return copy;
}

/** {@link cloneNode} for an element, typed so callers don't cast. */
export function cloneElement(element: MElement): MElement {
  return cloneNode(element) as MElement;
}
