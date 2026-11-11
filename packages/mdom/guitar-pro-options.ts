import type { Dispatcher } from "core/events";
import type { ArchiveOptions } from "./archive-reader";

/** Choices shared by Guitar Pro import and export. `maxUncompressedBytes` applies to import only. */
export interface GuitarProOptions extends ArchiveOptions {
	/** Reject unsupported musical features by default, or explicitly omit them. Layout is always regenerated. */
	unsupported?: "error" | "omit";
	/** Raises `unsupported` with each musical feature `unsupported: 'omit'` drops, once per occurrence, so a caller listening on it can report what a conversion lost. */
	events?: Dispatcher<GuitarProEvents>;
}

/** What a Guitar Pro conversion raises on `GuitarProOptions.events`. */
export interface GuitarProEvents extends Record<string, unknown> {
	/** A musical feature the conversion omitted. */
	unsupported: string;
}
