// spec(testkit.musicxml): a lightweight MusicXML builder for fixtures —
// describe the music a test cares about, emit valid MusicXML for mdom.parse.
// Deliberately not a complete MusicXML model; raw() is the escape hatch.

export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export type PitchSpec = string | { step: Step; octave: number; alter?: number };

type Resolved = { step: Step; octave: number; alter: number };

// spec(testkit.musicxml): a pitch is scientific-notation ('C#4', 'Bb3',
// 'F##5') or { step, octave, alter }.
function resolvePitch(spec: PitchSpec): Resolved {
  if (typeof spec !== 'string') {
    return { step: spec.step, octave: spec.octave, alter: spec.alter ?? 0 };
  }
  const match = /^([A-Ga-g])([#xb]*)(-?\d+)$/.exec(spec.trim());
  if (!match) {
    throw new Error(`testkit: invalid pitch '${spec}'`);
  }
  let alter = 0;
  for (const ch of match[2]!) {
    alter += ch === 'b' ? -1 : ch === 'x' ? 2 : 1;
  }
  return { step: match[1]!.toUpperCase() as Step, octave: Number(match[3]), alter };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

// spec(testkit.musicxml): durations are quarter notes; the builder derives
// the minimal integer <divisions> so every duration lands on a tick.
function denominator(quarters: number): number {
  for (let q = 1; q <= 10080; q++) {
    if (Math.abs(quarters * q - Math.round(quarters * q)) < 1e-7) {
      const p = Math.abs(Math.round(quarters * q));
      return q / gcd(p === 0 ? q : p, q);
    }
  }
  throw new Error(`testkit: cannot express duration ${quarters} as a tick`);
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(text: string): string {
  return esc(text).replace(/"/g, '&quot;');
}

type Child = { duration: number; render: (divisions: number) => string };

// spec(testkit.musicxml): the optional last argument to note/rest/chord is a
// callback over a chainable mod configurator covering the mdom.mods surface,
// plus voice/staff placement and type/dot overrides.
export class NoteMods {
  private graceFlag = false;
  private voiceNum?: number;
  private typeName?: string;
  private dots = 0;
  private accidentalName?: string;
  private timeMod?: string;
  private staffNum?: number;
  private readonly ties: string[] = [];
  private readonly beams: string[] = [];
  private readonly notations: string[] = [];
  private readonly lyrics: string[] = [];
  private readonly extra: string[] = [];

  grace(): this {
    this.graceFlag = true;
    return this;
  }

  voice(n: number): this {
    this.voiceNum = n;
    return this;
  }

  staff(n: number): this {
    this.staffNum = n;
    return this;
  }

  type(noteType: string): this {
    this.typeName = noteType;
    return this;
  }

  dot(count = 1): this {
    this.dots += count;
    return this;
  }

  accidental(name: string): this {
    this.accidentalName = name;
    return this;
  }

  // spec(testkit.musicxml): spanning mods emit their MusicXML start/stop
  // endpoints on the hosting notes; reconstructing the span is mdom's job.
  tie(type: 'start' | 'stop'): this {
    this.ties.push(`<tie type="${type}"/>`);
    this.notations.push(`<tied type="${type}"/>`);
    return this;
  }

  slur(type: 'start' | 'stop' | 'continue', number = 1): this {
    this.notations.push(`<slur type="${type}" number="${number}"/>`);
    return this;
  }

  beam(value: 'begin' | 'continue' | 'end' | 'forward hook' | 'backward hook', number = 1): this {
    this.beams.push(`<beam number="${number}">${value}</beam>`);
    return this;
  }

  tuplet(actual: number, normal: number, bracket: 'start' | 'stop' | false = 'start'): this {
    this.timeMod = `<time-modification><actual-notes>${actual}</actual-notes><normal-notes>${normal}</normal-notes></time-modification>`;
    if (bracket) {
      this.notations.push(`<tuplet type="${bracket}"/>`);
    }
    return this;
  }

  articulation(name: string): this {
    this.notations.push(`<articulations><${name}/></articulations>`);
    return this;
  }

  staccato(): this {
    return this.articulation('staccato');
  }

  accent(): this {
    return this.articulation('accent');
  }

  tenuto(): this {
    return this.articulation('tenuto');
  }

  marcato(): this {
    return this.articulation('strong-accent');
  }

  ornament(name: string): this {
    this.notations.push(`<ornaments><${name}/></ornaments>`);
    return this;
  }

  trill(): this {
    return this.ornament('trill-mark');
  }

  fermata(): this {
    this.notations.push('<fermata/>');
    return this;
  }

  dynamic(name: string): this {
    this.notations.push(`<dynamics><${name}/></dynamics>`);
    return this;
  }

  lyric(text: string, syllabic: 'single' | 'begin' | 'middle' | 'end' = 'single'): this {
    this.lyrics.push(`<lyric number="1"><syllabic>${syllabic}</syllabic><text>${esc(text)}</text></lyric>`);
    return this;
  }

  // spec(testkit.musicxml): raw() exists at note scope to inject verbatim XML
  // so a test never has to extend the builder for a one-off case.
  raw(xml: string): this {
    this.extra.push(xml);
    return this;
  }

  isGrace(): boolean {
    return this.graceFlag;
  }

  // MusicXML <note> child order: grace?, (chord?, pitch|rest), duration?,
  // tie*, voice?, type?, dot*, accidental?, time-modification?, staff?,
  // beam*, notations?, lyric*.
  renderGrace(): string {
    return this.graceFlag ? '<grace/>' : '';
  }

  renderTail(): string {
    const notations = this.notations.length > 0 ? `<notations>${this.notations.join('')}</notations>` : '';
    return [
      this.ties.join(''),
      this.voiceNum !== undefined ? `<voice>${this.voiceNum}</voice>` : '',
      this.typeName ? `<type>${esc(this.typeName)}</type>` : '',
      '<dot/>'.repeat(this.dots),
      this.accidentalName ? `<accidental>${esc(this.accidentalName)}</accidental>` : '',
      this.timeMod ?? '',
      this.staffNum !== undefined ? `<staff>${this.staffNum}</staff>` : '',
      this.beams.join(''),
      notations,
      this.lyrics.join(''),
      this.extra.join(''),
    ].join('');
  }
}

export type AttributesSpec = {
  divisions?: number;
  key?: number | { fifths: number; mode?: string };
  time?: [number, number];
  clef?: [string, number] | Array<[string, number]>;
  staves?: number;
  tempo?: number;
};

function renderAttributes(spec: AttributesSpec, divisions?: number): string {
  const parts: string[] = [];
  const div = spec.divisions ?? divisions;
  if (div !== undefined) {
    parts.push(`<divisions>${div}</divisions>`);
  }
  if (spec.key !== undefined) {
    const key = typeof spec.key === 'number' ? { fifths: spec.key } : spec.key;
    const mode = key.mode ? `<mode>${esc(key.mode)}</mode>` : '';
    parts.push(`<key><fifths>${key.fifths}</fifths>${mode}</key>`);
  }
  if (spec.time) {
    parts.push(`<time><beats>${spec.time[0]}</beats><beat-type>${spec.time[1]}</beat-type></time>`);
  }
  if (spec.staves !== undefined) {
    parts.push(`<staves>${spec.staves}</staves>`);
  }
  if (spec.clef) {
    const clefs = Array.isArray(spec.clef[0])
      ? (spec.clef as Array<[string, number]>)
      : [spec.clef as [string, number]];
    clefs.forEach(([sign, line], i) => {
      const number = clefs.length > 1 ? ` number="${i + 1}"` : '';
      parts.push(`<clef${number}><sign>${esc(sign)}</sign><line>${line}</line></clef>`);
    });
  }
  const attributesXml = parts.length > 0 ? `<attributes>${parts.join('')}</attributes>` : '';
  const tempo = spec.tempo
    ? `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit>` +
      `<per-minute>${spec.tempo}</per-minute></metronome></direction-type>` +
      `<sound tempo="${spec.tempo}"/></direction>`
    : '';
  return attributesXml + tempo;
}

export class Measure {
  private readonly children: Child[] = [];

  attributes(spec: AttributesSpec): this {
    this.children.push({ duration: 0, render: (d) => renderAttributes(spec, d) });
    return this;
  }

  note(pitch: PitchSpec, duration = 1, build?: (n: NoteMods) => void): this {
    return this.pushNote([resolvePitch(pitch)], duration, build);
  }

  chord(pitches: PitchSpec[], duration = 1, build?: (n: NoteMods) => void): this {
    return this.pushNote(pitches.map(resolvePitch), duration, build);
  }

  rest(duration = 1, build?: (n: NoteMods) => void): this {
    return this.pushNote([], duration, build);
  }

  backup(quarters: number): this {
    this.children.push({
      duration: 0,
      render: (d) => `<backup><duration>${Math.round(quarters * d)}</duration></backup>`,
    });
    return this;
  }

  forward(quarters: number): this {
    this.children.push({
      duration: 0,
      render: (d) => `<forward><duration>${Math.round(quarters * d)}</duration></forward>`,
    });
    return this;
  }

  // spec(testkit.musicxml): raw() exists at measure scope to inject verbatim
  // XML so a test never has to extend the builder for a one-off case.
  raw(xml: string): this {
    this.children.push({ duration: 0, render: () => xml });
    return this;
  }

  durations(): number[] {
    return this.children.map((c) => c.duration);
  }

  renderBody(divisions: number): string {
    return this.children.map((c) => c.render(divisions)).join('');
  }

  private pushNote(pitches: Resolved[], duration: number, build?: (n: NoteMods) => void): this {
    const mods = new NoteMods();
    build?.(mods);
    this.children.push({
      duration,
      render: (d) => {
        const grace = mods.renderGrace();
        const durationXml = mods.isGrace() ? '' : `<duration>${Math.round(duration * d)}</duration>`;
        const heads = pitches.length === 0 ? ['<rest/>'] : pitches.map((p, i) => renderPitch(p, i > 0));
        // A chord is N <note> elements; the tail (voice, beams, notations,
        // lyrics) rides on the last so it applies to the chord as a unit.
        return heads
          .map((head, i) => {
            const tail = i === heads.length - 1 ? mods.renderTail() : '';
            return `<note>${grace}${head}${durationXml}${tail}</note>`;
          })
          .join('');
      },
    });
    return this;
  }
}

function renderPitch(p: Resolved, chord: boolean): string {
  const alter = p.alter !== 0 ? `<alter>${p.alter}</alter>` : '';
  return `${chord ? '<chord/>' : ''}<pitch><step>${p.step}</step>${alter}<octave>${p.octave}</octave></pitch>`;
}

export class Part {
  readonly measures: Measure[] = [];
  private readonly specs: Array<AttributesSpec | undefined> = [];

  constructor(
    readonly id: string,
    readonly name: string
  ) {}

  measure(specOrBuild?: AttributesSpec | ((m: Measure) => void), build?: (m: Measure) => void): this {
    const spec = typeof specOrBuild === 'function' ? undefined : specOrBuild;
    const body = typeof specOrBuild === 'function' ? specOrBuild : build;
    const measure = new Measure();
    this.measures.push(measure);
    this.specs.push(spec);
    body?.(measure);
    return this;
  }

  specFor(index: number): AttributesSpec | undefined {
    return this.specs[index];
  }
}

export class Score {
  private readonly parts: Part[] = [];
  private flavor: 'partwise' | 'timewise' = 'partwise';
  private forcedDivisions?: number;
  private prelude = '';

  // spec(testkit.musicxml): timewise() emits score-timewise instead of the
  // default score-partwise, so both mdom.parse normalization paths are
  // testable from one description.
  timewise(): this {
    this.flavor = 'timewise';
    return this;
  }

  divisions(n: number): this {
    this.forcedDivisions = n;
    return this;
  }

  raw(xml: string): this {
    this.prelude += xml;
    return this;
  }

  part(name: string, build: (p: Part) => void): this {
    const part = new Part(`P${this.parts.length + 1}`, name);
    this.parts.push(part);
    build(part);
    return this;
  }

  toMusicXML(): string {
    const divisions = this.resolveDivisions();
    const partList = this.parts
      .map((p) => `<score-part id="${escAttr(p.id)}"><part-name>${esc(p.name)}</part-name></score-part>`)
      .join('');
    const root = this.flavor === 'partwise' ? 'score-partwise' : 'score-timewise';
    const body = this.flavor === 'partwise' ? this.renderPartwise(divisions) : this.renderTimewise(divisions);
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<${root} version="4.0">${this.prelude}<part-list>${partList}</part-list>${body}</${root}>`
    );
  }

  private resolveDivisions(): number {
    if (this.forcedDivisions !== undefined) {
      return this.forcedDivisions;
    }
    let divisions = 1;
    for (const part of this.parts) {
      for (const measure of part.measures) {
        for (const duration of measure.durations()) {
          if (duration > 0) {
            divisions = lcm(divisions, denominator(duration));
          }
        }
      }
    }
    return divisions;
  }

  // The first measure of each part carries <divisions> so the parser sees a
  // tick context before any note; explicit per-measure attributes merge in.
  private measureBody(part: Part, index: number, divisions: number): string {
    const spec = part.specFor(index);
    const merged = index === 0 ? { divisions, ...spec } : spec;
    const attributesXml = merged ? renderAttributes(merged, divisions) : '';
    return attributesXml + part.measures[index]!.renderBody(divisions);
  }

  private renderPartwise(divisions: number): string {
    return this.parts
      .map((part) => {
        const measures = part.measures
          .map((_, i) => `<measure number="${i + 1}">${this.measureBody(part, i, divisions)}</measure>`)
          .join('');
        return `<part id="${escAttr(part.id)}">${measures}</part>`;
      })
      .join('');
  }

  private renderTimewise(divisions: number): string {
    const count = Math.max(0, ...this.parts.map((p) => p.measures.length));
    let out = '';
    for (let i = 0; i < count; i++) {
      out += `<measure number="${i + 1}">`;
      for (const part of this.parts) {
        const body = i < part.measures.length ? this.measureBody(part, i, divisions) : '';
        out += `<part id="${escAttr(part.id)}">${body}</part>`;
      }
      out += `</measure>`;
    }
    return out;
  }
}

// spec(testkit.musicxml): score is the only entry point — it takes a builder
// callback and returns a MusicXML string.
export function score(build: (s: Score) => void): string {
  const s = new Score();
  build(s);
  return s.toMusicXML();
}
