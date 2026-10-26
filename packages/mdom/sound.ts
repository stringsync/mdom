import { MElement } from './m-node';

/** Quarter-note beats per swing unit; MusicXML's default swing type is the eighth. */
const SWING_UNITS: Record<string, number> = {
	eighth: 0.5,
	'16th': 0.25,
	'32nd': 0.125,
};

/**
 * The repeat-structure playback a `<sound>` carries: the landmarks a jump lands
 * on, and the jumps. Landmarks and jumps pair by name — a `dalSegno: 'A'` goes
 * back to the `segno: 'A'` — so a score with one of each can name both alike.
 */
export interface SoundSpec {
	/** Name this point as the segno a D.S. returns to. */
	segno?: string;
	/** Jump back to the named segno (by default the first time through). */
	dalSegno?: string;
	/** Name this point as the coda a to-coda goes to. */
	coda?: string;
	/** Jump ahead to the named coda (by default the second time through). */
	toCoda?: string;
	/** Jump back to the start of the movement (by default the first time through). */
	daCapo?: boolean;
	/** End the movement here once a D.C. or D.S. has been taken. */
	fine?: boolean;
	/** Imply a forward repeat here without printing one. */
	forwardRepeat?: boolean;
	/** The passes through a repeat this applies on, overriding the defaults above. */
	timeOnly?: number[];
}

/**
 * A `<sound>`: playback instructions with no printed form. It appears both inside
 * a `<direction>` and as a direct `<measure>` child, with the same meaning — see
 * {@link Measure.sounds}, which merges the two so a consumer looks in one place.
 */
export class Sound extends MElement {
	constructor() {
		super('sound');
	}

	/** The `tempo` attribute in quarter notes per minute; null when unset. */
	get tempo(): number | null {
		const tempo = this.getAttribute('tempo');
		return tempo == null ? null : Number(tempo);
	}

	/** The `dynamics` attribute (percent of a forte velocity); null when unset. */
	get dynamics(): number | null {
		const dynamics = this.getAttribute('dynamics');
		return dynamics == null ? null : Number(dynamics);
	}

	/**
	 * `segno`: this is the segno a D.S. jumps back to, named by the value so a
	 * `dalsegno` can pick it out among several; null when it is not one.
	 */
	get segno(): string | null {
		return this.getAttribute('segno');
	}

	/** `dalsegno`: jump back to the segno this names; null when it is not a D.S. */
	get dalSegno(): string | null {
		return this.getAttribute('dalsegno');
	}

	/** `coda`: this is the coda a to-coda jumps to, named by the value; null when it is not one. */
	get coda(): string | null {
		return this.getAttribute('coda');
	}

	/** `tocoda`: jump ahead to the coda this names; null when it is not a to-coda. */
	get toCoda(): string | null {
		return this.getAttribute('tocoda');
	}

	/** `dacapo`: jump back to the start of the movement. */
	get daCapo(): boolean {
		return this.getAttribute('dacapo') === 'yes';
	}

	/**
	 * `fine`: the movement ends here once a D.C. or D.S. has been taken. `'yes'`,
	 * or the final note's sounding duration in divisions; null when it is not one.
	 */
	get fine(): string | null {
		return this.getAttribute('fine');
	}

	/** `forward-repeat`: a forward repeat is implied here though none is printed. */
	get forwardRepeat(): boolean {
		return this.getAttribute('forward-repeat') === 'yes';
	}

	/**
	 * `time-only`: the passes through a repeat this applies on (`"1,3"`), raw;
	 * null when it applies every time — though a D.S. or D.C. defaults to the
	 * first pass and a to-coda to the second.
	 */
	get timeOnly(): string | null {
		return this.getAttribute('time-only');
	}

	/**
	 * `<swing>`: the on-beat:off-beat ratio and the note value it divides.
	 * `<straight/>` reads as an even 1:1 so it cancels a carried swing rather than
	 * reading as "no instruction". `unit` is in quarter-note beats — eighth = 0.5,
	 * 16th = 0.25. Null when this sound states no swing at all.
	 */
	get swing(): { first: number; second: number; unit: number } | null {
		const swing = this.child('swing');
		if (!swing) {
			return null;
		}
		const unit =
			SWING_UNITS[swing.child('swing-type')?.text ?? 'eighth'] ?? 0.5;
		if (swing.child('straight')) {
			return { first: 1, second: 1, unit };
		}
		const first = swing.child('first')?.text;
		const second = swing.child('second')?.text;
		if (first == null || second == null) {
			return null;
		}
		return { first: Number(first), second: Number(second), unit };
	}
}

/** Write a {@link SoundSpec} onto a `<sound>`'s attributes. */
export function writeSound(sound: Sound, spec: SoundSpec): void {
	const attributes: Array<[string, string | undefined]> = [
		['segno', spec.segno],
		['dalsegno', spec.dalSegno],
		['coda', spec.coda],
		['tocoda', spec.toCoda],
		['dacapo', spec.daCapo ? 'yes' : undefined],
		['fine', spec.fine ? 'yes' : undefined],
		['forward-repeat', spec.forwardRepeat ? 'yes' : undefined],
		['time-only', spec.timeOnly?.join(',')],
	];
	for (const [name, value] of attributes) {
		if (value != null) {
			sound.setAttribute(name, value);
		}
	}
}
