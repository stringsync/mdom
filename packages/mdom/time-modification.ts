import { MElement } from './m-node';
import { appendValue } from './measure';
import type { NoteType } from './note';

/** Cumulative performed ratio; normal-type/dots describe the ratio's reference unit. */
export interface TimeModificationSpec {
	actual: number;
	normal: number;
	normalType?: NoteType | null;
	normalDots?: number;
}

export interface TimeModification {
	actual: number;
	normal: number;
	normalType: NoteType | null;
	normalDots: number;
}

export function readTimeModification(
	node: MElement | null,
): TimeModification | null {
	const actual = node?.child('actual-notes')?.text;
	const normal = node?.child('normal-notes')?.text;
	if (actual == null || normal == null) {
		return null;
	}
	return {
		actual: Number(actual),
		normal: Number(normal),
		normalType: (node?.child('normal-type')?.text ?? null) as NoteType | null,
		normalDots: node?.childrenNamed('normal-dot').length ?? 0,
	};
}

export function validateDots(dots: number = 0): void {
	if (!Number.isSafeInteger(dots) || dots < 0) {
		throw new Error('dots must be a non-negative integer');
	}
}

export function buildTimeModification(
	spec: TimeModificationSpec,
	tag = 'time-modification',
): MElement {
	validateTimeModification(spec);
	const node = new MElement(tag);
	appendValue(node, 'actual-notes', String(spec.actual));
	appendValue(node, 'normal-notes', String(spec.normal));
	if (spec.normalType != null) {
		appendValue(node, 'normal-type', spec.normalType);
	}
	for (let i = 0; i < (spec.normalDots ?? 0); i++) {
		node.append(new MElement('normal-dot'));
	}
	return node;
}

export function validateTimeModification(spec: TimeModificationSpec): void {
	for (const value of [spec.actual, spec.normal]) {
		if (!Number.isSafeInteger(value) || value <= 0) {
			throw new Error('time modification ratios must be positive integers');
		}
	}
	validateDots(spec.normalDots);
	if ((spec.normalDots ?? 0) > 0 && spec.normalType == null) {
		throw new Error('normal dots require normal-type');
	}
}
