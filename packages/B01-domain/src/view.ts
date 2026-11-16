/**
 * What the user is looking at. The store remembers these choices and the
 * screens draw them, so the vocabulary lives below both.
 */

/** The three main screens. */
export type Screen = "today" | "planner" | "progress";

/** Which side of the body map is shown. */
export type MapView = "both" | "front" | "back";

/** How the body map shows coverage: filled by intensity, or outlines only. */
export type MapStyle = "heat" | "outline";

/** The two views of the Progress screen's consistency card. */
export type ProgressTab = "calendar" | "weekly";
