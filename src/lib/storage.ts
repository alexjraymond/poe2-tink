// The single gateway to persisted bookmark data.
//
// Why a dedicated module?
//   - The React UI never imports chrome.storage directly. It calls these
//     functions instead, so storage details (key name, schema, the
//     read-modify-write dance) live in exactly one place.
//   - `subscribe` turns chrome.storage's change events into a simple callback,
//     which the UI uses to stay reactive (and in sync across tabs).

import {
  emptyState,
  type Bookmark,
  type BookmarksState,
  type Folder,
} from "./types";

const STORAGE_KEY = "poe2tink:bookmarks";

/** Read the full state (or an empty state if nothing is saved yet). */
export async function getState(): Promise<BookmarksState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as BookmarksState | undefined) ?? emptyState();
}

async function setState(state: BookmarksState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

/**
 * Subscribe to state changes from any context (this tab, another tab, popup…).
 * Returns an unsubscribe function.
 */
export function subscribe(
  callback: (state: BookmarksState) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      callback(
        (changes[STORAGE_KEY].newValue as BookmarksState) ?? emptyState()
      );
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

function nextOrder(items: { order: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.order), -1) + 1;
}

function newId(): string {
  return crypto.randomUUID();
}

// ── Folder mutations ──────────────────────────────────────────────────────

export async function addFolder(title: string): Promise<Folder> {
  const state = await getState();
  const folder: Folder = {
    id: newId(),
    title: title.trim() || "New folder",
    order: nextOrder(state.folders),
    createdAt: Date.now(),
  };
  await setState({ ...state, folders: [...state.folders, folder] });
  return folder;
}

export async function renameFolder(id: string, title: string): Promise<void> {
  const state = await getState();
  await setState({
    ...state,
    folders: state.folders.map((f) =>
      f.id === id ? { ...f, title: title.trim() || f.title } : f
    ),
  });
}

/** Deleting a folder unfiles its bookmarks rather than destroying them. */
export async function deleteFolder(id: string): Promise<void> {
  const state = await getState();
  await setState({
    ...state,
    folders: state.folders.filter((f) => f.id !== id),
    bookmarks: state.bookmarks.map((b) =>
      b.folderId === id ? { ...b, folderId: null } : b
    ),
  });
}

// ── Bookmark mutations ────────────────────────────────────────────────────

export async function addBookmark(
  input: Omit<Bookmark, "id" | "order" | "createdAt">
): Promise<Bookmark> {
  const state = await getState();
  const siblings = state.bookmarks.filter(
    (b) => b.folderId === input.folderId
  );
  const bookmark: Bookmark = {
    ...input,
    id: newId(),
    order: nextOrder(siblings),
    createdAt: Date.now(),
  };
  await setState({ ...state, bookmarks: [...state.bookmarks, bookmark] });
  return bookmark;
}

export async function deleteBookmark(id: string): Promise<void> {
  const state = await getState();
  await setState({
    ...state,
    bookmarks: state.bookmarks.filter((b) => b.id !== id),
  });
}

// ── Reordering ────────────────────────────────────────────────────────────
// Callers pass the full list of ids in their desired order; we rewrite each
// item's `order` to its index. Rewriting the whole list (rather than nudging
// individual values) keeps ordering dense and avoids drift over many moves.

export async function reorderFolders(orderedIds: string[]): Promise<void> {
  const state = await getState();
  const indexById = new Map(orderedIds.map((id, index) => [id, index]));
  await setState({
    ...state,
    folders: state.folders.map((f) =>
      indexById.has(f.id) ? { ...f, order: indexById.get(f.id)! } : f
    ),
  });
}

/**
 * Move a bookmark into `toFolderId` and apply a new ordering to that folder.
 * `orderedIds` is the full id list of the destination folder *after* the move
 * (including the moved bookmark). This single function covers both same-folder
 * reordering (`toFolderId` equals the current folder) and cross-folder moves.
 */
export async function moveBookmark(
  id: string,
  toFolderId: string | null,
  orderedIds: string[]
): Promise<void> {
  const state = await getState();
  const indexById = new Map(orderedIds.map((bid, index) => [bid, index]));
  await setState({
    ...state,
    bookmarks: state.bookmarks.map((b) => {
      if (b.id === id) {
        return { ...b, folderId: toFolderId, order: indexById.get(id) ?? b.order };
      }
      if (b.folderId === toFolderId && indexById.has(b.id)) {
        return { ...b, order: indexById.get(b.id)! };
      }
      return b;
    }),
  });
}
