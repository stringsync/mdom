import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { Note } from './note';
import { cloneElement, elementFor } from './registry';
import { Clef } from './clef';
import { Technical } from './technical';

// The empty and half-built shapes a query has to survive: a measure with no
// notes, a note with no measure, a direction that carries nothing, a part-list
// whose markers don't line up. None of these are hypothetical — they're what a
// score looks like mid-edit, and what exporters emit on a bad day.
describe('queries over an empty or detached tree', () => {
  const empty = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();

  it('answers an empty measure without folding a timeline', () => {
    expect(empty.notes).toEqual([]);
    expect(empty.voices).toEqual([]);
    expect(empty.chords).toEqual([]);
    expect(empty.beams).toEqual([]);
    expect(empty.beamRuns()).toEqual([]);
    expect(empty.directions).toEqual([]);
    expect(empty.sounds).toEqual([]);
    expect(empty.figuredBasses).toEqual([]);
    expect(empty.barlines).toEqual([]);
    expect(empty.endBeat).toBe(0); // no divisions declared yet
  });

  it('reports no clef changes in a measure that has no notes to place them against', () => {
    // Every <attributes> here is the measure's own signature block, by definition.
    empty.setClef({ sign: 'G', line: 2 });
    expect(empty.clefChanges()).toEqual([]);
    expect(empty.clefAtEnd()?.sign).toBe('G');
    expect(empty.getStaffTunings()).toEqual([]);
  });

  it('answers null rather than throwing for a note outside any measure', () => {
    const loose = new Note();
    expect(loose.clef).toBeNull();
    expect(loose.key).toBeNull();
    expect(loose.time).toBeNull();
    expect(loose.divisions).toBeNull();
    expect(loose.measureBeat).toBeNull();
    expect(loose.beats).toBeNull();
    expect(loose.gracesBefore).toEqual([]);
    expect(loose.staveCount).toBe(1);
    expect(loose.staveLines).toBe(5);
    expect(() => loose.measure).toThrow('<measure> ancestor of <note>');
    expect(() => loose.part).toThrow('<part> ancestor of <note>');
  });

  it('answers empty for a direction that carries no direction-type children', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P2' }).addMeasure();
    const direction = elementFor('direction');
    measure.append(direction);
    const typed = measure.directions[0]!;
    expect(typed.metronomes).toEqual([]);
    expect(typed.metronome).toBeNull();
    expect(typed.dynamics).toEqual([]);
    expect(typed.rehearsals).toEqual([]);
    expect(typed.words).toEqual([]);
    expect(typed.navigations).toEqual([]);
    expect(typed.sound).toBeNull();
    expect(typed.soundTempo).toBeNull();
    expect(typed.staff).toBe('1');
    expect(typed.placement).toBeNull();
    expect(typed.color).toBeNull();
    expect(typed.measure).toBe(measure);
  });
});

describe('part-list markers that do not line up', () => {
  const groupsOf = (partList: string, parts = '<part id="P1"><measure number="1"/></part>') =>
    new MDOMParser().parseFromString(`<score-partwise><part-list>${partList}</part-list>${parts}</score-partwise>`)
      .score.partGroups;

  it('ignores a stop whose number never started', () => {
    expect(groupsOf('<score-part id="P1"/><part-group type="stop" number="9"/>')).toEqual([]);
  });

  it('drops a group that covers no part', () => {
    // Start and stop with no <score-part> between them.
    expect(groupsOf('<score-part id="P1"/><part-group type="start"/><part-group type="stop"/>')).toEqual([]);
  });

  it('ignores part-list children that are neither score-part nor part-group', () => {
    const groups = groupsOf('<part-group type="start"/><score-part id="P1"/><foo/><part-group type="stop"/>');
    expect(groups).toHaveLength(1);
    expect(groups[0]!.fromPartIndex).toBe(0);
  });
});

describe('registry — cloning keeps the typed classes', () => {
  it('rebuilds a subtree that answers the same typed queries', () => {
    const source = new MDOMParser().parseFromString(
      `<attributes><clef number="2"><sign>F</sign><line>4</line></clef></attributes>`
    ).root;
    const copy = cloneElement(source);

    expect(copy).not.toBe(source);
    expect(copy.childrenOfType(Clef)[0]).toBeInstanceOf(Clef);
    expect(copy.childrenOfType(Clef)[0]!.sign).toBe('F');
    expect(copy.childrenOfType(Clef)[0]!.staff).toBe('2');
    expect(copy.childrenOfType(Clef)[0]!.line).toBe(4);
    expect(copy.parent).toBeNull(); // detached
  });

  it('falls back to a plain element for an unmodeled tag, which still round-trips', () => {
    const exotic = elementFor('some-future-tag');
    expect(exotic.constructor.name).toBe('MElement');
    expect(exotic.tag).toBe('some-future-tag');

    const copy = cloneElement(
      new MDOMParser().parseFromString('<wrapper attr="kept"><unknown>text</unknown></wrapper>').root
    );
    expect(copy.getAttribute('attr')).toBe('kept');
    expect(copy.child('unknown')?.text).toBe('text');
  });

  it('gives the tag-family classes the tag they were matched on', () => {
    const fingering = elementFor('fingering');
    expect(fingering).toBeInstanceOf(Technical);
    expect((fingering as Technical).technicalType).toBe('fingering');
    expect(elementFor('pluck').tag).toBe('pluck');
  });
});

describe('scaling and colors that had no coverage', () => {
  it('exposes the mm-per-tenth ratio the conversions are built on', () => {
    const scaling = new MDOMParser().parseFromString(
      `<score-partwise><defaults><scaling><millimeters>7</millimeters><tenths>40</tenths></scaling></defaults>
       <part id="P1"><measure number="1"/></part></score-partwise>`
    ).score.scaling;
    expect(scaling.mmPerTenth).toBeCloseTo(0.175);
    expect(scaling.toMillimeters(40)).toBeCloseTo(7);
    expect(scaling.fromMillimeters(7)).toBeCloseTo(40);
  });

  it('normalizes color on the direction marks too', () => {
    const direction = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1"><measure number="1">
        <direction color="#FF102030" placement="below">
          <direction-type><dynamics color="#112233"><mf/></dynamics></direction-type>
          <direction-type><rehearsal color="#FF445566">B</rehearsal></direction-type>
        </direction>
      </measure></part></score-partwise>`
      )
      .score.getPart('P1')!
      .getMeasure('1')!.directions[0]!;

    expect(direction.color).toBe('#102030');
    expect(direction.placement).toBe('below');
    expect(direction.dynamics[0]!.color).toBe('#112233');
    expect(direction.rehearsals[0]!.color).toBe('#445566');
  });
});

describe('harmony and figured bass — placement and ancestry', () => {
  const measure = new MDOMParser()
    .parseFromString(
      `<score-partwise><part id="P1"><measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <harmony placement="above"><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <harmony><root><root-step>G</root-step></root></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure></part></score-partwise>`
    )
    .score.getPart('P1')!
    .getMeasure('1')!;

  it('reads placement and the measure it sits in', () => {
    const [first, second] = measure.harmonies;
    expect(first!.placement).toBe('above');
    expect(second!.placement).toBeNull();
    expect(first!.measure).toBe(measure);
  });

  it('returns null for a harmony that states no kind', () => {
    expect(measure.harmonies[0]!.kind).toEqual({ value: 'major-seventh', text: 'maj7' });
    expect(measure.harmonies[1]!.kind).toBeNull();
    expect(measure.harmonies[1]!.bass).toBeNull();
  });
});

describe('beam runs — the secondary end that closes the whole beam', () => {
  it('does not report a break after the last note of a run', () => {
    const measure = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1"><measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>16th</type>
          <beam number="1">begin</beam><beam number="2">begin</beam></note>
        <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>16th</type>
          <beam number="1">end</beam><beam number="2">end</beam></note>
      </measure></part></score-partwise>`
      )
      .score.getPart('P1')!
      .getMeasure('1')!;

    const [run] = measure.beamRuns();
    expect(run!.notes).toHaveLength(2);
    expect(run!.breaksAfter).toEqual([]); // the level-2 end IS the run's end
  });

  it('ignores a continue that never had a begin', () => {
    const measure = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1"><measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type>
          <beam number="1">continue</beam></note>
      </measure></part></score-partwise>`
      )
      .score.getPart('P1')!
      .getMeasure('1')!;
    expect(measure.beamRuns()).toEqual([]);
  });
});

describe('voice — the part it belongs to', () => {
  it('reaches the part through its measure', () => {
    const part = MDocument.empty().score.addPart({ id: 'P1' });
    const voice = part.addMeasure().getOrCreateVoice('1');
    expect(voice.part).toBe(part);
  });
});
