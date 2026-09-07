import { extname, resolve } from 'node:path';
import {
	type GuitarProOptions,
	GuitarProParser,
	GuitarProSerializer,
	MDOMParser,
	type MDocument,
	MusicXMLSerializer,
	MXLSerializer,
} from '@stringsync/mdom';
import { ConsoleLogger, type Logger } from 'webappwiz/log';
import { NodeScoreFiles } from './node-score-files';
import type { ScoreFiles } from './score-files';

export interface ConvertOptions {
	input: string;
	output: string;
	/** The directory where the CLI was invoked, before it changed to the repository root. */
	cwd: string;
	force?: boolean;
	omitUnsupported?: boolean;
	files?: ScoreFiles;
	log?: Logger;
}

/** Converts a score between MusicXML, compressed MusicXML and Guitar Pro 7/8. */
export async function convert(opts: ConvertOptions): Promise<void> {
	const input = resolve(opts.cwd, opts.input);
	const output = resolve(opts.cwd, opts.output);
	if (input === output) {
		throw new Error('Input and output must be different paths');
	}
	const source = formatOf(input);
	const target = formatOf(output);
	const files = opts.files ?? new NodeScoreFiles();
	const log = opts.log ?? new ConsoleLogger();
	const guitarPro: GuitarProOptions = {
		unsupported: opts.omitUnsupported ? 'omit' : 'error',
	};
	const doc = await parse(await files.read(input), source, guitarPro);
	if (doc.root.tag !== 'score-partwise') {
		throw new Error(
			`Expected a score-partwise document, got <${doc.root.tag}>`,
		);
	}
	const bytes = await serialize(doc, target, guitarPro);
	await files.write(output, bytes, { overwrite: opts.force ?? false });
	log.info(`wrote ${output}`);
}

type Format = 'musicxml' | 'mxl' | 'gp';

function formatOf(path: string): Format {
	switch (extname(path).toLowerCase()) {
		case '.xml':
		case '.musicxml':
			return 'musicxml';
		case '.mxl':
			return 'mxl';
		case '.gp':
			return 'gp';
		default:
			throw new Error(
				`Unsupported score extension: ${extname(path) || '(none)'}. Use .musicxml, .xml, .mxl or .gp (Guitar Pro 7/8).`,
			);
	}
}

async function parse(
	bytes: Uint8Array<ArrayBuffer>,
	format: Format,
	opts: GuitarProOptions,
): Promise<MDocument> {
	switch (format) {
		case 'musicxml':
			return new MDOMParser().parseFromString(
				new TextDecoder('utf-8', { fatal: true }).decode(bytes),
			);
		case 'mxl':
			return new MDOMParser().parseFromBlob(new Blob([bytes]));
		case 'gp':
			return new GuitarProParser().parseFromBytes(bytes, opts);
	}
}

async function serialize(
	doc: MDocument,
	format: Format,
	opts: GuitarProOptions,
): Promise<Uint8Array> {
	switch (format) {
		case 'musicxml':
			return new TextEncoder().encode(
				new MusicXMLSerializer().serializeToString(doc),
			);
		case 'mxl':
			return new Uint8Array(
				await (await new MXLSerializer().serializeToBlob(doc)).arrayBuffer(),
			);
		case 'gp':
			return new GuitarProSerializer().serializeToBytes(doc, opts);
	}
}
