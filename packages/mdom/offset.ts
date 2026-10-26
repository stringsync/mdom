import { MElement, required } from './m-node';
import { Measure } from './measure';
import { setYesNo, yesNoOf } from './print-style';
import { divisionsBackFrom } from './signature';

/**
 * An `<offset>`: how far from its cursor position a harmony, direction or sound
 * applies. Positive is later in the measure, negative earlier.
 */
export interface Offset {
	/** The offset in quarter-note beats; null when no `<divisions>` is in effect. */
	beats: number | null;
	/** The offset in divisions, as written. */
	divisions: number;
	/**
	 * `sound`: whether playback moves with the offset too, not just the printed
	 * position. Unstated, MusicXML makes it false for a harmony or direction and
	 * true for a `<sound>`'s own offset, which has no printed position to move.
	 */
	sound: boolean;
}

/** An `<offset>` to write: beats from the cursor position, and whether playback moves too. */
export interface OffsetSpec {
	beats: number;
	sound?: boolean;
}

/** The `<offset>` child of `host`, or null when it applies where it sits. */
export function offsetOf(
	host: MElement,
	soundFallback: boolean,
): Offset | null {
	const offset = host.child('offset');
	const text = offset?.text;
	if (offset == null || text == null || text.trim() === '') {
		return null;
	}
	const divisions = Number(text);
	const perQuarter = divisionsAt(host);
	return {
		divisions,
		beats: perQuarter ? divisions / perQuarter : null,
		sound: yesNoOf(offset, 'sound', soundFallback),
	};
}

/**
 * Replace the `<offset>` child of `host` from a beat count, converted with the
 * divisions in effect there, inserted before `before`; null removes it.
 */
export function writeOffset(
	host: MElement,
	offset: OffsetSpec | null,
	before: () => MElement | null,
): void {
	host.child('offset')?.remove();
	if (offset == null) {
		return;
	}
	const perQuarter = required(
		divisionsAt(host),
		`divisions to write a <${host.tag}> offset`,
	);
	const element = new MElement('offset');
	element.setText(String(offset.beats * perQuarter));
	if (offset.sound != null) {
		setYesNo(element, 'sound', offset.sound);
	}
	host.insertBefore(element, before());
}

/** The divisions in effect where `element` sits in its measure, or null. */
function divisionsAt(element: MElement): number | null {
	const measure = element.closest(Measure);
	if (!measure) {
		return null;
	}
	let child: MElement = element;
	while (child.parent !== measure && child.parent) {
		child = child.parent;
	}
	return divisionsBackFrom(measure, measure.children.indexOf(child));
}
