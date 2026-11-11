import { Dispatcher } from "core/events";
import type { GuitarProEvents } from "./guitar-pro-options";

/** Events whose `unsupported` features are pushed onto `into`, for tests. */
export const collectUnsupported = (
	into: string[],
): Dispatcher<GuitarProEvents> => {
	const events = new Dispatcher<GuitarProEvents>();
	events.on("unsupported", (feature) => into.push(feature));
	return events;
};
