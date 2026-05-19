// spec(testing.musicxml): a lightweight MusicXML builder for fixtures —
// describe the music a test cares about, emit valid MusicXML for mdom.parse.
// Deliberately not a complete MusicXML model; raw() is the escape hatch.
import { type Element, js2xml } from 'xml-js';

type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

type PitchSpec = string | { step: Step; octave: number; alter?: number };

type Resolved = { step: Step; octave: number; alter: number };

// The builder describes music as an xml-js element tree and serializes it
// once with js2xml, so escaping and self-closing tags are the library's job,
// not hand-rolled string interpolation.
type Attrs = Record<string, string | number | undefined>;

function el(name: string, attributes?: Attrs, children: Element[] = []): Element {
  const node: Element = { type: 'element', name, elements: children };
  if (attributes) {
    const defined = Object.entries(attributes).filter(([, v]) => v !== undefined);
    if (defined.length > 0) {
      node.attributes = Object.fromEntries(defined) as Element['attributes'];
    }
  }
  return node;
}

function leaf(name: string, value: string | number, attributes?: Attrs): Element {
  return el(name, attributes, [{ type: 'text', text: value }]);
}

// Rendering is deferred until toMusicXML knows the tick context; raw() also
// needs the serialization-scoped placeholder sink so verbatim XML survives
// js2xml without being re-escaped.
type RenderCtx = { divisions: number; raw: (xml: string) => Element };

// spec(testing.pitch): a pitch is scientific-notation ('C#4', 'Bb3',
// 'F##5') or { step, octave, alter }.
function resolvePitch(spec: PitchSpec): Resolved {
  if (typeof spec !== 'string') {
    return { step: spec.step, octave: spec.octave, alter: spec.alter ?? 0 };
  }
  const match = /^([A-Ga-g])([#xb]*)(-?\d+)$/.exec(spec.trim());
  if (!match) {
    throw new Error(`testing: invalid pitch '${spec}'`);
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

// spec(testing.durations): durations are quarter notes; named so call sites
// read as music, not arithmetic. dotted/triplet are parallel namespaces:
// durations.dotted.half, durations.triplet.eighth.
type NoteValues = Record<'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | '32nd', number>;

const base: NoteValues = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
  '32nd': 0.125,
};

const scale = (f: (d: number) => number): NoteValues =>
  Object.fromEntries(Object.entries(base).map(([k, v]) => [k, f(v)])) as NoteValues;

export const durations = {
  ...base,
  dotted: scale((d) => d * 1.5),
  triplet: scale((d) => (d * 2) / 3),
};

// spec(testing.durations): durations are quarter notes; the builder derives
// the minimal integer <divisions> so every duration lands on a tick.
function denominator(quarters: number): number {
  for (let q = 1; q <= 10080; q++) {
    if (Math.abs(quarters * q - Math.round(quarters * q)) < 1e-7) {
      const p = Math.abs(Math.round(quarters * q));
      return q / gcd(p === 0 ? q : p, q);
    }
  }
  throw new Error(`testing: cannot express duration ${quarters} as a tick`);
}

type Child = { duration: number; render: (ctx: RenderCtx) => Element[] };

// spec(testing.mods): the optional last argument to note/rest/chord is a
// callback over a chainable mod configurator covering the mdom.mods surface,
// plus voice/staff placement and type/dot overrides.
class NoteMods {
  private graceFlag = false;
  private voiceNum?: number;
  private typeName?: string;
  private dots = 0;
  private accidentalName?: string;
  private timeMod?: Element;
  private staffNum?: number;
  private readonly ties: Element[] = [];
  private readonly beams: Element[] = [];
  private readonly notations: Element[] = [];
  private readonly lyrics: Element[] = [];
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

  // spec(testing.mods): spanning mods emit their MusicXML start/stop
  // endpoints on the hosting notes; reconstructing the span is mdom's job.
  tie(type: 'start' | 'stop'): this {
    this.ties.push(el('tie', { type }));
    this.notations.push(el('tied', { type }));
    return this;
  }

  slur(type: 'start' | 'stop' | 'continue', number = 1): this {
    this.notations.push(el('slur', { type, number }));
    return this;
  }

  beam(value: 'begin' | 'continue' | 'end' | 'forward hook' | 'backward hook', number = 1): this {
    this.beams.push(leaf('beam', value, { number }));
    return this;
  }

  tuplet(actual: number, normal: number, bracket: 'start' | 'stop' | false = 'start'): this {
    this.timeMod = el('time-modification', undefined, [leaf('actual-notes', actual), leaf('normal-notes', normal)]);
    if (bracket) {
      this.notations.push(el('tuplet', { type: bracket }));
    }
    return this;
  }

  articulation(name: string): this {
    this.notations.push(el('articulations', undefined, [el(name)]));
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
    this.notations.push(el('ornaments', undefined, [el(name)]));
    return this;
  }

  trill(): this {
    return this.ornament('trill-mark');
  }

  fermata(): this {
    this.notations.push(el('fermata'));
    return this;
  }

  dynamic(name: string): this {
    this.notations.push(el('dynamics', undefined, [el(name)]));
    return this;
  }

  lyric(text: string, syllabic: 'single' | 'begin' | 'middle' | 'end' = 'single'): this {
    this.lyrics.push(el('lyric', { number: 1 }, [leaf('syllabic', syllabic), leaf('text', text)]));
    return this;
  }

  // spec(testing.escapes): raw() exists at note scope to inject verbatim XML
  // so a test never has to extend the builder for a one-off case.
  raw(xml: string): this {
    this.extra.push(xml);
    return this;
  }

  isGrace(): boolean {
    return this.graceFlag;
  }

  graceEl(): Element | undefined {
    return this.graceFlag ? el('grace') : undefined;
  }

  // MusicXML <note> child order: grace?, (chord?, pitch|rest), duration?,
  // tie*, voice?, type?, dot*, accidental?, time-modification?, staff?,
  // beam*, notations?, lyric*.
  tail(ctx: RenderCtx): Element[] {
    const out: Element[] = [...this.ties];
    if (this.voiceNum !== undefined) {
      out.push(leaf('voice', this.voiceNum));
    }
    if (this.typeName) {
      out.push(leaf('type', this.typeName));
    }
    for (let i = 0; i < this.dots; i++) {
      out.push(el('dot'));
    }
    if (this.accidentalName) {
      out.push(leaf('accidental', this.accidentalName));
    }
    if (this.timeMod) {
      out.push(this.timeMod);
    }
    if (this.staffNum !== undefined) {
      out.push(leaf('staff', this.staffNum));
    }
    out.push(...this.beams);
    if (this.notations.length > 0) {
      out.push(el('notations', undefined, this.notations));
    }
    out.push(...this.lyrics);
    for (const xml of this.extra) {
      out.push(ctx.raw(xml));
    }
    return out;
  }
}

type AttributesSpec = {
  divisions?: number;
  key?: number | { fifths: number; mode?: string };
  time?: [number, number];
  clef?: [string, number] | Array<[string, number]>;
  staves?: number;
  tempo?: number;
};

function renderAttributes(spec: AttributesSpec, ctx: RenderCtx): Element[] {
  const inner: Element[] = [];
  const div = spec.divisions ?? ctx.divisions;
  if (div !== undefined) {
    inner.push(leaf('divisions', div));
  }
  if (spec.key !== undefined) {
    const key = typeof spec.key === 'number' ? { fifths: spec.key } : spec.key;
    const children = [leaf('fifths', key.fifths)];
    if (key.mode) {
      children.push(leaf('mode', key.mode));
    }
    inner.push(el('key', undefined, children));
  }
  if (spec.time) {
    inner.push(el('time', undefined, [leaf('beats', spec.time[0]), leaf('beat-type', spec.time[1])]));
  }
  if (spec.staves !== undefined) {
    inner.push(leaf('staves', spec.staves));
  }
  if (spec.clef) {
    const clefs = Array.isArray(spec.clef[0])
      ? (spec.clef as Array<[string, number]>)
      : [spec.clef as [string, number]];
    clefs.forEach(([sign, line], i) => {
      const attrs = clefs.length > 1 ? { number: i + 1 } : undefined;
      inner.push(el('clef', attrs, [leaf('sign', sign), leaf('line', line)]));
    });
  }
  const out: Element[] = [];
  if (inner.length > 0) {
    out.push(el('attributes', undefined, inner));
  }
  if (spec.tempo) {
    out.push(
      el('direction', { placement: 'above' }, [
        el('direction-type', undefined, [
          el('metronome', undefined, [leaf('beat-unit', 'quarter'), leaf('per-minute', spec.tempo)]),
        ]),
        el('sound', { tempo: spec.tempo }),
      ])
    );
  }
  return out;
}

class Measure {
  private readonly children: Child[] = [];

  attributes(spec: AttributesSpec): this {
    this.children.push({ duration: 0, render: (ctx) => renderAttributes(spec, ctx) });
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
      render: (ctx) => [el('backup', undefined, [leaf('duration', Math.round(quarters * ctx.divisions))])],
    });
    return this;
  }

  forward(quarters: number): this {
    this.children.push({
      duration: 0,
      render: (ctx) => [el('forward', undefined, [leaf('duration', Math.round(quarters * ctx.divisions))])],
    });
    return this;
  }

  // spec(testing.escapes): raw() exists at measure scope to inject verbatim
  // XML so a test never has to extend the builder for a one-off case.
  raw(xml: string): this {
    this.children.push({ duration: 0, render: (ctx) => [ctx.raw(xml)] });
    return this;
  }

  durations(): number[] {
    return this.children.map((c) => c.duration);
  }

  renderBody(ctx: RenderCtx): Element[] {
    return this.children.flatMap((c) => c.render(ctx));
  }

  private pushNote(pitches: Resolved[], duration: number, build?: (n: NoteMods) => void): this {
    const mods = new NoteMods();
    build?.(mods);
    this.children.push({
      duration,
      render: (ctx) => {
        const durationEl = mods.isGrace() ? undefined : leaf('duration', Math.round(duration * ctx.divisions));
        const heads = pitches.length === 0 ? [[el('rest')]] : pitches.map((p, i) => pitchEls(p, i > 0));
        // A chord is N <note> elements; the tail (voice, beams, notations,
        // lyrics) rides on the last so it applies to the chord as a unit.
        return heads.map((head, i) => {
          const children: Element[] = [];
          const grace = mods.graceEl();
          if (grace) {
            children.push(grace);
          }
          children.push(...head);
          if (durationEl) {
            children.push(durationEl);
          }
          if (i === heads.length - 1) {
            children.push(...mods.tail(ctx));
          }
          return el('note', undefined, children);
        });
      },
    });
    return this;
  }
}

function pitchEls(p: Resolved, chord: boolean): Element[] {
  const inner: Element[] = [leaf('step', p.step)];
  if (p.alter !== 0) {
    inner.push(leaf('alter', p.alter));
  }
  inner.push(leaf('octave', p.octave));
  const pitch = el('pitch', undefined, inner);
  return chord ? [el('chord'), pitch] : [pitch];
}

class Part {
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
  private forcedDivisions?: number;
  private readonly prelude: string[] = [];

  constructor(private readonly flavor: 'partwise' | 'timewise' = 'partwise') {}

  divisions(n: number): this {
    this.forcedDivisions = n;
    return this;
  }

  raw(xml: string): this {
    this.prelude.push(xml);
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
    // js2xml escapes text and attributes, so verbatim raw() XML is stitched
    // back in after serialization via unique placeholders.
    const raws: string[] = [];
    const token = (i: number): string => `__MDOM_RAW_${i}__`;
    const ctx: RenderCtx = {
      divisions,
      raw: (xml) => {
        const node: Element = { type: 'text', text: token(raws.length) };
        raws.push(xml);
        return node;
      },
    };

    const root = this.flavor === 'partwise' ? 'score-partwise' : 'score-timewise';
    const prelude = this.prelude.map((xml) => ctx.raw(xml));
    const partList = el(
      'part-list',
      undefined,
      this.parts.map((p) => el('score-part', { id: p.id }, [leaf('part-name', p.name)]))
    );
    const body = this.flavor === 'partwise' ? this.renderPartwise(ctx) : this.renderTimewise(ctx);

    const tree: Element = {
      declaration: { attributes: { version: '1.0', encoding: 'UTF-8' } },
      elements: [el(root, { version: '4.0' }, [...prelude, partList, ...body])],
    };
    let xml = js2xml(tree);
    raws.forEach((fragment, i) => {
      xml = xml.split(token(i)).join(fragment);
    });
    return xml;
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
  private measureBody(part: Part, index: number, ctx: RenderCtx): Element[] {
    const spec = part.specFor(index);
    const merged = index === 0 ? { divisions: ctx.divisions, ...spec } : spec;
    const attributes = merged ? renderAttributes(merged, ctx) : [];
    return [...attributes, ...part.measures[index]!.renderBody(ctx)];
  }

  private renderPartwise(ctx: RenderCtx): Element[] {
    return this.parts.map((part) =>
      el(
        'part',
        { id: part.id },
        part.measures.map((_, i) => el('measure', { number: i + 1 }, this.measureBody(part, i, ctx)))
      )
    );
  }

  private renderTimewise(ctx: RenderCtx): Element[] {
    const count = Math.max(0, ...this.parts.map((p) => p.measures.length));
    const measures: Element[] = [];
    for (let i = 0; i < count; i++) {
      measures.push(
        el(
          'measure',
          { number: i + 1 },
          this.parts.map((part) =>
            el('part', { id: part.id }, i < part.measures.length ? this.measureBody(part, i, ctx) : [])
          )
        )
      );
    }
    return measures;
  }
}

function buildScore(flavor: 'partwise' | 'timewise', build: (s: Score) => void): string {
  const s = new Score(flavor);
  build(s);
  return s.toMusicXML();
}

// spec(testing.musicxml): score is the only entry point — it takes a builder
// callback and returns a MusicXML string.
export const score = {
  partwise: (build: (s: Score) => void): string => buildScore('partwise', build),
  // spec(testing.escapes): score.timewise emits score-timewise instead of the
  // default score-partwise, so both mdom.parse normalization paths are
  // testable from one description.
  timewise: (build: (s: Score) => void): string => buildScore('timewise', build),
  flavored: (flavor: 'partwise' | 'timewise', build: (s: Score) => void): string => buildScore(flavor, build),
};
