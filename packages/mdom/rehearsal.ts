import { FormattedTextElement } from './formatted-text';

/**
 * A `<rehearsal>` under `<direction-type>`: the boxed letter or number a
 * conductor calls out. Its {@link enclosure} is what distinguishes it visually
 * from a plain `<words>` direction.
 */
export class Rehearsal extends FormattedTextElement {
	constructor() {
		super('rehearsal');
	}

	/**
	 * `enclosure`: 'square' | 'circle' | 'rectangle' | 'none' | …; null when
	 * unstated. MusicXML's default is a square, but that's a renderer's rule to
	 * apply — absence stays distinct from an explicit value.
	 */
	get enclosure(): string | null {
		return this.getAttribute('enclosure');
	}
}
