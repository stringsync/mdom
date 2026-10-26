import { MElement } from './m-node';
import { appendValue } from './measure';

/**
 * A `<time>` inside `<attributes>`. Usually one beats/beat-type pair; composite
 * meters list several. `symbol` covers common/cut/etc.; senza-misura is unmetered.
 */
export class Time extends MElement {
	constructor() {
		super('time');
	}

	/** Staff this time applies to; '1' when omitted. */
	get staff(): string {
		return this.getAttribute('number') ?? '1';
	}

	/** Numerator of the first beats/beat-type pair. */
	get beats(): string | null {
		return this.child('beats')?.text ?? null;
	}

	/** Denominator of the first beats/beat-type pair. */
	get beatType(): string | null {
		return this.child('beat-type')?.text ?? null;
	}

	/** Every beats/beat-type pair in order (composite meters have more than one). */
	get components(): { beats: string; beatType: string }[] {
		const beats = this.childrenNamed('beats');
		const beatTypes = this.childrenNamed('beat-type');
		return beats.map((numerator, index) => ({
			beats: numerator.text ?? '',
			beatType: beatTypes[index]?.text ?? '',
		}));
	}

	/** Notational symbol: common, cut, single-number, note, dotted-note, normal. */
	get symbol(): string | null {
		return this.getAttribute('symbol');
	}

	/** Text used for an unmetered signature; null when absent, empty string when explicitly empty. */
	get senzaMisura(): string | null {
		return this.child('senza-misura')?.text ?? (this.isSenzaMisura ? '' : null);
	}

	get separator(): TimeSeparator | null {
		return this.getAttribute('separator') as TimeSeparator | null;
	}

	get interchangeable(): {
		components: { beats: string; beatType: string }[];
		relation: TimeRelation | null;
		symbol: string | null;
		separator: TimeSeparator | null;
	} | null {
		const node = this.child('interchangeable');
		if (!node) {
			return null;
		}
		return {
			components: node.childrenNamed('beats').map((beat, index) => ({
				beats: beat.text ?? '',
				beatType: node.childrenNamed('beat-type')[index]?.text ?? '',
			})),
			relation: (node.child('time-relation')?.text ??
				null) as TimeRelation | null,
			symbol: node.getAttribute('symbol'),
			separator: node.getAttribute('separator') as TimeSeparator | null,
		};
	}

	/** Whether this is an unmetered `<senza-misura>` signature. */
	get isSenzaMisura(): boolean {
		return this.child('senza-misura') !== null;
	}
}

export interface TimeComponentSpec {
	beats: string | number;
	beatType: string | number;
}
export type TimeRelation =
	| 'parentheses'
	| 'bracket'
	| 'equals'
	| 'slash'
	| 'space'
	| 'hyphen';
export type TimeSeparator =
	| 'none'
	| 'horizontal'
	| 'diagonal'
	| 'vertical'
	| 'adjacent';
export interface InterchangeableSpec {
	components: TimeComponentSpec[];
	relation?: TimeRelation;
	symbol?: string;
	separator?: TimeSeparator;
}
export type TimeSpec = (
	| {
			beats: string | number;
			beatType: string | number;
			components?: never;
			senzaMisura?: never;
	  }
	| {
			components: TimeComponentSpec[];
			beats?: never;
			beatType?: never;
			senzaMisura?: never;
	  }
	| {
			senzaMisura: string | true;
			beats?: never;
			beatType?: never;
			components?: never;
			interchangeable?: never;
	  }
) & {
	symbol?: string;
	separator?: TimeSeparator;
	staff?: string;
	onset?: number;
	interchangeable?: InterchangeableSpec;
};

function writeComponents(
	node: MElement,
	components: TimeComponentSpec[],
): void {
	if (components.length === 0) {
		throw new Error('time signature needs at least one component');
	}
	for (const component of components) {
		appendValue(node, 'beats', String(component.beats));
		appendValue(node, 'beat-type', String(component.beatType));
	}
}

export function buildTime(spec: TimeSpec): Time {
	const time = new Time();
	if (spec.staff != null) {
		time.setAttribute('number', spec.staff);
	}
	if (spec.symbol != null) {
		time.setAttribute('symbol', spec.symbol);
	}
	if (spec.separator != null) {
		time.setAttribute('separator', spec.separator);
	}
	if (spec.senzaMisura != null) {
		appendValue(
			time,
			'senza-misura',
			spec.senzaMisura === true ? '' : spec.senzaMisura,
		);
	} else {
		writeComponents(
			time,
			spec.components ?? [{ beats: spec.beats!, beatType: spec.beatType! }],
		);
		if (spec.interchangeable) {
			const other = new MElement('interchangeable');
			if (spec.interchangeable.symbol != null) {
				other.setAttribute('symbol', spec.interchangeable.symbol);
			}
			if (spec.interchangeable.separator != null) {
				other.setAttribute('separator', spec.interchangeable.separator);
			}
			if (spec.interchangeable.relation != null) {
				appendValue(other, 'time-relation', spec.interchangeable.relation);
			}
			writeComponents(other, spec.interchangeable.components);
			time.append(other);
		}
	}
	return time;
}
