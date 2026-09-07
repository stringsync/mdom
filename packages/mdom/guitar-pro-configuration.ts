// SPDX-License-Identifier: MPL-2.0
// Adapted from alphaTab's PartConfiguration/LayoutConfiguration format handling.
// Copyright © 2025 Daniel Kuschny and Contributors. See THIRD_PARTY.md.
import type { MDocument } from './m-document';

/** The first score view controls whether internal strings are shown as tablature. */
export class GuitarProConfiguration {
	readTablature(bytes: Uint8Array): boolean[] {
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		let offset = 0;
		const int = () => {
			if (offset + 4 > bytes.length) {
				throw new Error('Truncated Guitar Pro PartConfiguration');
			}
			const n = view.getInt32(offset);
			offset += 4;
			if (n < 0 || n > bytes.length) {
				throw new Error('Invalid Guitar Pro PartConfiguration count');
			}
			return n;
		};
		const views = int();
		const result: boolean[] = [];
		for (let i = 0; i < views; i++) {
			offset++;
			const count = int();
			if (offset + count > bytes.length) {
				throw new Error('Truncated Guitar Pro PartConfiguration');
			}
			for (let j = 0; j < count; j++) {
				const flags = bytes[offset++]!;
				if (i === 0) {
					result.push((flags & 2) !== 0);
				}
			}
		}
		return result;
	}
	write(document: MDocument): { part: Uint8Array; layout: Uint8Array } {
		const flags = document.score.parts.map((p) =>
			p.measures[0]!.getStaffTunings('1').length ? 3 : 1,
		);
		const part = new Uint8Array(13 + flags.length * 7);
		const view = new DataView(part.buffer);
		view.setInt32(0, flags.length + 1);
		view.setInt32(5, flags.length);
		part.set(flags, 9);
		let offset = 9 + flags.length;
		for (const flag of flags) {
			view.setInt32(offset + 1, 1);
			part[offset + 5] = flag;
			offset += 6;
		}
		view.setInt32(offset, 1);
		const layout = new Uint8Array(6 + flags.length * 2);
		new DataView(layout.buffer).setInt32(0, 4);
		layout[5] = document.score.parts.some(
			(p) => new Set(p.measures[0]!.notes.map((n) => n.voice)).size > 1,
		)
			? 255
			: 0;
		layout.fill(255, 6);
		return { part, layout };
	}
}
