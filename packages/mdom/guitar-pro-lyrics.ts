// SPDX-License-Identifier: MPL-2.0
import { GuitarProXml as X } from "./guitar-pro-xml";
import type { MElement } from "./m-element";
import type { Note } from "./note";
import type { Part } from "./part";

/** One beat's worth of Guitar Pro lyric text: the words sung on it, and where it sits in its word. */
interface Syllable {
	text: string[];
	syllabic: "single" | "begin" | "middle" | "end";
}

/**
 * Guitar Pro lyrics: per track, lines of text starting at a bar, one syllable
 * per beat that sounds a new note. Whitespace and `-` split syllables (a `-`
 * keeps the word going), `+` sings several words on one beat, `_` is a space
 * inside a syllable, and a lone `-` skips a beat.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: a namespace for the lyric helpers
export class GuitarProLyrics {
	/** Split lyric text into the syllable each beat sings; null skips a beat. */
	static split(text: string): (Syllable | null)[] {
		const syllables: (Syllable | null)[] = [];
		let continuing = false;
		for (const token of text.split(/\s+/).filter(Boolean)) {
			if (/^-+$/.test(token)) {
				syllables.push(null);
				continuing = false;
				continue;
			}
			const pieces = token.split("-");
			const trailing = pieces[pieces.length - 1] === "";
			const words = pieces.filter(Boolean);
			for (const [index, word] of words.entries()) {
				const last = index === words.length - 1;
				const continuesAfter = !last || trailing;
				const joined = continuing || index > 0;
				let syllabic: Syllable["syllabic"] = "single";
				if (joined) {
					syllabic = continuesAfter ? "middle" : "end";
				} else if (continuesAfter) {
					syllabic = "begin";
				}
				syllables.push({
					text: word.split("+").map((run) => run.replaceAll("_", " ")),
					syllabic,
				});
				continuing = continuesAfter;
			}
			continuing = trailing;
		}
		return syllables;
	}

	/** Sing each line of the track's `<Lyrics>` on the part's notes, one verse per line. */
	static read(track: MElement, part: Part): void {
		const lines = track.child("Lyrics")?.childrenNamed("Line") ?? [];
		for (const [lineIndex, line] of lines.entries()) {
			const text = line.child("Text")?.text ?? "";
			const syllables = GuitarProLyrics.split(text);
			if (!syllables.length) {
				continue;
			}
			const start = Math.max(0, Number(line.child("Offset")?.text ?? 0));
			const notes = part.measures
				.slice(start)
				.flatMap((measure) => GuitarProLyrics.singable(measure.notes));
			for (const [index, syllable] of syllables.entries()) {
				const note = notes[index];
				if (!note) {
					break;
				}
				if (syllable) {
					note.setLyric({
						text: syllable.text,
						syllabic: syllable.syllabic,
						verse: String(lineIndex + 1),
					});
				}
			}
		}
	}

	/** Write the part's lyrics as one line per verse, starting at the first bar with a lyric. */
	static write(track: MElement, part: Part): void {
		const verses = new Set<string>();
		for (const measure of part.measures) {
			for (const note of measure.notes) {
				for (const lyric of note.lyrics) {
					verses.add(lyric.verse);
				}
			}
		}
		if (!verses.size) {
			return;
		}
		const lyrics = X.add(track, "Lyrics", undefined, { dispatched: "true" });
		for (const verse of [...verses].sort(
			(first, second) =>
				Number(first) - Number(second) || first.localeCompare(second),
		)) {
			const first = part.measures.findIndex((measure) =>
				measure.notes.some((note) => note.getLyric(verse)),
			);
			const tokens: string[] = [];
			for (const measure of part.measures.slice(first)) {
				for (const note of GuitarProLyrics.singable(measure.notes)) {
					const lyric = note.getLyric(verse);
					if (!lyric) {
						tokens.push("-");
						continue;
					}
					const joined = lyric.runs
						.map((run) =>
							run.kind === "elision" ? "+" : run.text.replaceAll(" ", "_"),
						)
						.join("");
					const continues =
						lyric.syllabic === "begin" || lyric.syllabic === "middle";
					if (joined === "") {
						tokens.push("-");
					} else {
						tokens.push(continues ? `${joined}-` : joined);
					}
				}
			}
			while (tokens[tokens.length - 1] === "-") {
				tokens.pop();
			}
			const line = X.add(lyrics, "Line");
			X.add(line, "Text", tokens.join(" "));
			X.add(line, "Offset", first);
		}
	}

	/** The notes Guitar Pro hangs a syllable on: the first staff's first voice, no rests, grace notes or tie continuations. */
	private static singable(notes: readonly Note[]): Note[] {
		return notes.filter(
			(note) =>
				note.staff === "1" &&
				note.voice === "1" &&
				!note.isRest &&
				!note.isChordMember &&
				!note.isGrace &&
				!note.playbackTies.includes("stop"),
		);
	}
}
