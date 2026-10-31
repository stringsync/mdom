import type { FermataShape } from "./note";
import type { Ottava } from "./octave-shift";

/** GPIF fermata types and the MusicXML shapes that print them. */
export const FERMATAS: Record<string, FermataShape> = {
	Short: "angled",
	Medium: "normal",
	Long: "square",
};

/** GPIF tremolo picking speeds and their tremolo slash counts. */
export const TREMOLOS: Record<string, number> = {
	"1/2": 1,
	"1/4": 2,
	"1/8": 3,
};

export const OTTAVAS: readonly Ottava[] = ["8va", "8vb", "15ma", "15mb"];
