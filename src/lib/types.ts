// Shared domain types for the bookmarking feature.
// Keeping these in one place means the content script, popup, options, and
// background worker all agree on the data shape.

/** The realm segment in PoE2 trade URLs is always "poe2". */
export const REALM = "poe2";

/** Whether a trade page is a regular item search or a bulk/currency exchange. */
export type TradeKind = "search" | "exchange";

/**
 * A parsed representation of a PoE2 trade page location.
 * Derived purely from the URL — see `lib/trade-location.ts`.
 */
export interface TradeLocation {
  kind: TradeKind;
  realm: string;
  league: string;
  /** Present only once a specific search has been run/opened. */
  searchId?: string;
}

/** A user-created group that holds bookmarks. */
export interface Folder {
  id: string;
  title: string;
  /** Lower numbers sort first. */
  order: number;
  createdAt: number;
}

/** A saved trade search. */
export interface Bookmark {
  id: string;
  /** null = "Unfiled" (not inside any folder). */
  folderId: string | null;
  title: string;
  kind: TradeKind;
  league: string;
  searchId: string;
  order: number;
  createdAt: number;
}

/** The entire persisted state, stored under a single storage key. */
export interface BookmarksState {
  /** Schema version, so we can migrate the shape later without breaking. */
  version: 1;
  folders: Folder[];
  bookmarks: Bookmark[];
}

export function emptyState(): BookmarksState {
  return { version: 1, folders: [], bookmarks: [] };
}
