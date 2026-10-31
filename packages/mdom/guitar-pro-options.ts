import type { ArchiveOptions } from "./archive-reader";

/** Choices shared by Guitar Pro import and export. `maxUncompressedBytes` applies to import only. */
export interface GuitarProOptions extends ArchiveOptions {
	/** Reject unsupported musical features by default, or explicitly omit them. Layout is always regenerated. */
	unsupported?: "error" | "omit";
	/** Called with each musical feature `unsupported: 'omit'` drops, once per occurrence, so a caller can report what a conversion lost. */
	onUnsupported?: (feature: string) => void;
}
