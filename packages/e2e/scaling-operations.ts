import {
	Cursor,
	GuitarProParser,
	GuitarProSerializer,
	MDOMParser,
	type MDocument,
	MusicXMLSerializer,
	MXLSerializer,
	type Note,
} from '@stringsync/mdom';
import { SystemClock } from 'webappwiz/time';
import { ArchiveReader } from '../mdom/archive-reader';
import { required } from '../mdom/m-node';
import { onsetsIn } from '../mdom/timeline';

export const operations = [
	'parse',
	'mxl-unzip',
	'gp-parse',
	'gpif-parse',
	'serialize-xml',
	'serialize-mxl',
	'serialize-gp',
	'read-walk',
	'cursor',
	'edit-insert-read',
	'edit-remove-read',
	'edit-set-read',
	'span-add',
	'history',
] as const;
export type Operation = (typeof operations)[number];

const clock = new SystemClock();
export function heapUsed(): number {
	Bun.gc(true);
	// Ps has no heap/GC API: this is the runtime metric being benchmarked.
	return process.memoryUsage().heapUsed;
}

export interface Sample {
	elapsedMs: number;
	heapBeforeBytes: number;
	heapAfterBytes: number;
	heapDeltaBytes: number;
	documentHeapBytes: number;
	checksum: number;
	workUnits: number;
	inputParts: number;
	phasesMs?: { edit: number; undo: number; redo: number };
	history?: {
		entries: number;
		afterEditBytes: number;
		growthBytesPerEdit: number;
		retainedBytes: number;
		bytesPerEntry: number;
		afterUndoBytes: number;
		afterRedoBytes: number;
		afterDisposeBytes: number;
	};
}

export function readWalk(document: MDocument): number {
	let checksum = 0;
	for (const part of document.score.parts) {
		for (const measure of part.measures) {
			for (let staffIndex = 1; staffIndex <= measure.staveCount; staffIndex++) {
				const staff = String(staffIndex);
				checksum += Number(!!measure.getClef(staff));
				checksum += Number(!!measure.getKey(staff));
				checksum += Number(!!measure.getTime(staff));
				checksum += Number(!!measure.getTranspose(staff));
			}
			for (const onset of onsetsIn(measure).values()) {
				checksum += onset;
			}
			for (const note of measure.notes) {
				checksum +=
					(note.measureBeat ?? 0) + (note.beats ?? 0) + (note.divisions ?? 0);
				for (const slur of note.slurs) {
					checksum += Number(!!slur.partner);
				}
				for (const tie of note.ties) {
					checksum += Number(!!tie.partner);
				}
			}
		}
	}
	return checksum;
}

export function cursorWalk(document: MDocument): number {
	let checksum = 0;
	for (const part of document.score.parts) {
		// Discover each voice once, then walk it from its first to last onset.
		const firstNotes = new Map<string, Note>();
		for (const measure of part.measures) {
			for (const note of measure.notes) {
				const identity = `${note.voice}:${note.staff}`;
				if (!firstNotes.has(identity)) {
					firstNotes.set(identity, note);
				}
			}
		}
		for (const firstNote of firstNotes.values()) {
			let cursor: Cursor | null = Cursor.at(firstNote);
			while (cursor) {
				checksum++;
				cursor = cursor.next();
			}
		}
	}
	return checksum;
}

interface ImportInput {
	archiveBytes?: Uint8Array;
	gpif?: string;
}

// Import inputs depend only on the operation and score, and building them (a
// full Guitar Pro export for gpif-parse) costs far more than the timed import,
// so repeated samples of one score reuse them. Guards alternate two scores;
// keeping a few bounds what a bench sweep retains.
const importInputs = new Map<string, Promise<ImportInput>>();
const importInputLimit = 4;

function importInput(
	operation: Operation,
	xml: string,
	document: MDocument,
): Promise<ImportInput> {
	if (
		operation !== 'mxl-unzip' &&
		operation !== 'gp-parse' &&
		operation !== 'gpif-parse'
	) {
		return Promise.resolve({});
	}
	const key = `${operation}\0${xml}`;
	let input = importInputs.get(key);
	if (!input) {
		input = buildImportInput(operation, document);
		input.catch(() => importInputs.delete(key));
		importInputs.set(key, input);
		if (importInputs.size > importInputLimit) {
			importInputs.delete(importInputs.keys().next().value!);
		}
	}
	return input;
}

async function buildImportInput(
	operation: 'mxl-unzip' | 'gp-parse' | 'gpif-parse',
	document: MDocument,
): Promise<ImportInput> {
	if (operation === 'mxl-unzip') {
		return {
			archiveBytes: new Uint8Array(
				await (
					await new MXLSerializer().serializeToBlob(document)
				).arrayBuffer(),
			),
		};
	}
	const archiveBytes = await new GuitarProSerializer().serializeToBytes(
		document,
		{ unsupported: 'omit' },
	);
	if (operation === 'gp-parse') {
		return { archiveBytes };
	}
	return {
		gpif: required(
			await (await ArchiveReader.load(archiveBytes)).text('Content/score.gpif'),
			'GP archive score.gpif',
		),
	};
}

export async function measureOperation(
	operation: Operation,
	xml: string,
	edits: number,
): Promise<Sample> {
	const parser = new MDOMParser();
	const emptyHeap = heapUsed();
	const document = parser.parseFromString(xml);
	const documentHeapBytes = heapUsed() - emptyHeap;
	// All input construction (including compression for import cases) is untimed.
	const { archiveBytes, gpif } = await importInput(operation, xml, document);
	const measures = document.score.parts.flatMap((part) => [...part.measures]);
	const notes = measures.flatMap((measure) => measure.notes);
	if (!notes.length) {
		throw new Error('Benchmark requires at least one note');
	}
	const history = operation === 'history' ? document.history : undefined;
	const editCount = edits || notes.length;
	const heapBeforeBytes = heapUsed();
	let checksum = 0;
	let workUnits = notes.length;
	let retained: unknown;
	let phasesMs: Sample['phasesMs'];
	let historyMetrics: Sample['history'];
	let heapAfterBytes: number;
	let elapsedMs: number;
	const started = clock.now();
	switch (operation) {
		case 'parse':
			retained = parser.parseFromString(xml);
			break;
		case 'mxl-unzip': {
			const archive = await ArchiveReader.load(archiveBytes!);
			retained = await archive.text('score.musicxml');
			break;
		}
		case 'gp-parse':
			retained = await new GuitarProParser().parseFromBytes(archiveBytes!);
			break;
		case 'gpif-parse':
			retained = parser.parseFromString(gpif!);
			break;
		case 'serialize-xml':
			retained = new MusicXMLSerializer().serializeToString(document);
			break;
		case 'serialize-mxl':
			retained = await new MXLSerializer().serializeToBlob(document);
			break;
		case 'serialize-gp':
			retained = await new GuitarProSerializer().serializeToBytes(document, {
				unsupported: 'omit',
			});
			break;
		case 'read-walk':
			checksum = readWalk(document);
			break;
		case 'cursor':
			checksum = cursorWalk(document);
			workUnits = checksum;
			break;
		case 'edit-insert-read':
		case 'edit-remove-read':
		case 'edit-set-read': {
			// Exactly one read after each edit. Read the far end of the same part,
			// exposing invalidation without accidentally timing an entire read walk.
			const sentinels = new Map(
				document.score.parts.map((part) => [part, part.measures.at(-1)!]),
			);
			workUnits =
				operation === 'edit-remove-read'
					? Math.min(editCount, notes.length)
					: editCount;
			for (let editIndex = 0; editIndex < workUnits; editIndex++) {
				const note = notes[editIndex % notes.length]!;
				const measure = note.parent as (typeof measures)[number];
				const sentinel = sentinels.get(measure.part)!;
				if (operation === 'edit-insert-read') {
					measure
						.getOrCreateVoice('1')
						.addNote({ step: 'C', octave: 4, type: 'quarter' });
				} else if (operation === 'edit-remove-read') {
					note.remove();
				} else {
					note.setPitch({
						step: note.pitch?.step === 'C' ? 'D' : 'C',
						octave: 5,
					});
				}
				checksum += Number(!!sentinel.getKey());
			}
			break;
		}
		case 'span-add': {
			// A slur, tuplet and tie between each pair of neighboring notes in a
			// part: three interleaved kinds, each number allocated against the
			// spans already added.
			workUnits = 0;
			for (const part of document.score.parts) {
				const partNotes = part.measures.flatMap((measure) => measure.notes);
				for (let index = 1; index < partNotes.length; index++) {
					const first = partNotes[index - 1]!;
					const last = partNotes[index]!;
					checksum += Number(first.addSlur(last).number);
					checksum += Number(first.addTuplet(last).number);
					checksum += Number(first.addTie(last).number);
					workUnits += 3;
				}
			}
			break;
		}
		case 'history': {
			workUnits = editCount;
			for (let editIndex = 0; editIndex < editCount; editIndex++) {
				const note = notes[editIndex % notes.length]!;
				history!.edit(`pitch ${editIndex}`, () =>
					note.setPitch({
						step: note.pitch?.step === 'C' ? 'D' : 'C',
						octave: 5,
					}),
				);
			}
			const editMs = clock.now().subtract(started).ms;
			const afterEdit = heapUsed();
			const undoStart = clock.now();
			let undoCount = 0;
			while (history!.undo()) {
				undoCount++;
			}
			const undoMs = clock.now().subtract(undoStart).ms;
			const afterUndoBytes = heapUsed();
			const redoStart = clock.now();
			while (history!.redo()) {
				checksum++;
			}
			const redoMs = clock.now().subtract(redoStart).ms;
			heapAfterBytes = heapUsed();
			phasesMs = { edit: editMs, undo: undoMs, redo: redoMs };
			elapsedMs = editMs + undoMs + redoMs;
			history!.dispose();
			const afterDisposeBytes = heapUsed();
			historyMetrics = {
				entries: undoCount,
				afterEditBytes: afterEdit,
				growthBytesPerEdit: (afterEdit - heapBeforeBytes) / undoCount,
				retainedBytes: heapAfterBytes - afterDisposeBytes,
				bytesPerEntry: (heapAfterBytes - afterDisposeBytes) / undoCount,
				afterUndoBytes,
				afterRedoBytes: heapAfterBytes,
				afterDisposeBytes,
			};
			return {
				elapsedMs,
				heapBeforeBytes,
				heapAfterBytes,
				heapDeltaBytes: heapAfterBytes - heapBeforeBytes,
				documentHeapBytes,
				checksum,
				workUnits,
				inputParts: document.score.parts.length,
				phasesMs,
				history: historyMetrics,
			};
		}
	}
	elapsedMs = clock.now().subtract(started).ms;
	heapAfterBytes = heapUsed();
	// Keep outputs live across GC. Observe them after measuring, outside the timer.
	if (typeof retained === 'string') {
		checksum += retained.length;
	} else if (retained instanceof Uint8Array) {
		checksum += retained.byteLength;
	} else if (retained instanceof Blob) {
		checksum += retained.size;
	} else if (operation === 'gpif-parse') {
		checksum += (retained as MDocument).root.children.length;
	} else if (retained) {
		checksum += (retained as MDocument).score.parts.length;
	}
	return {
		elapsedMs,
		heapBeforeBytes,
		heapAfterBytes,
		heapDeltaBytes: heapAfterBytes - heapBeforeBytes,
		documentHeapBytes,
		checksum,
		workUnits,
		inputParts: document.score.parts.length,
	};
}
