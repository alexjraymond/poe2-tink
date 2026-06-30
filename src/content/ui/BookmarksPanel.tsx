import { useMemo, useState } from "react";
import type { Bookmark, BookmarksState, TradeLocation } from "../../lib/types";
import {
  addBookmark,
  addFolder,
  deleteBookmark,
  deleteFolder,
} from "../../lib/storage";
import { buildTradeUrl } from "../../lib/trade-location";

interface Props {
  state: BookmarksState;
  currentLocation: TradeLocation | null;
}

export function BookmarksPanel({ state, currentLocation }: Props) {
  const folders = useMemo(
    () => [...state.folders].sort((a, b) => a.order - b.order),
    [state.folders]
  );

  // Group bookmarks by folder id ("" key = Unfiled), each sorted by order.
  const byFolder = useMemo(() => {
    const map = new Map<string, Bookmark[]>();
    for (const b of state.bookmarks) {
      const key = b.folderId ?? "";
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [state.bookmarks]);

  const openBookmark = (bookmark: Bookmark) => {
    window.location.href = buildTradeUrl(bookmark);
  };

  return (
    <div className="tink-panel">
      <header className="tink-header">
        <span className="tink-logo">⚒</span>
        <h1>POE2 Tink</h1>
      </header>

      <AddCurrentSearch
        currentLocation={currentLocation}
        folders={folders}
      />

      <NewFolder />

      <div className="tink-list">
        {folders.length === 0 && (byFolder.get("")?.length ?? 0) === 0 && (
          <p className="tink-empty">
            No bookmarks yet. Run a search, then save it above.
          </p>
        )}

        {folders.map((folder) => (
          <section key={folder.id} className="tink-folder">
            <div className="tink-folder-head">
              <span className="tink-folder-title">{folder.title}</span>
              <button
                className="tink-icon-btn"
                title="Delete folder"
                onClick={() => deleteFolder(folder.id)}
              >
                ✕
              </button>
            </div>
            <BookmarkList
              bookmarks={byFolder.get(folder.id) ?? []}
              onOpen={openBookmark}
            />
          </section>
        ))}

        {(byFolder.get("")?.length ?? 0) > 0 && (
          <section className="tink-folder">
            <div className="tink-folder-head">
              <span className="tink-folder-title tink-muted">Unfiled</span>
            </div>
            <BookmarkList
              bookmarks={byFolder.get("") ?? []}
              onOpen={openBookmark}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function BookmarkList({
  bookmarks,
  onOpen,
}: {
  bookmarks: Bookmark[];
  onOpen: (b: Bookmark) => void;
}) {
  if (bookmarks.length === 0) {
    return <p className="tink-empty tink-empty-sm">Empty</p>;
  }
  return (
    <ul className="tink-bookmarks">
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id} className="tink-bookmark">
          <button
            className="tink-bookmark-open"
            title={`${bookmark.league} · ${bookmark.kind}`}
            onClick={() => onOpen(bookmark)}
          >
            <span className="tink-bookmark-title">{bookmark.title}</span>
            <span className="tink-bookmark-meta">{bookmark.league}</span>
          </button>
          <button
            className="tink-icon-btn"
            title="Delete bookmark"
            onClick={() => deleteBookmark(bookmark.id)}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddCurrentSearch({
  currentLocation,
  folders,
}: {
  currentLocation: TradeLocation | null;
  folders: BookmarksState["folders"];
}) {
  const [title, setTitle] = useState("");
  const [folderId, setFolderId] = useState<string>("");

  const canSave = Boolean(currentLocation?.searchId);

  const save = async () => {
    if (!currentLocation?.searchId) return;
    await addBookmark({
      folderId: folderId || null,
      title: title.trim() || `${currentLocation.league} search`,
      kind: currentLocation.kind,
      league: currentLocation.league,
      searchId: currentLocation.searchId,
    });
    setTitle("");
  };

  return (
    <div className="tink-add">
      <div className="tink-current">
        {canSave ? (
          <>
            <span className="tink-current-label">Current search</span>
            <span className="tink-current-value">
              {currentLocation!.league} · {currentLocation!.kind}
            </span>
          </>
        ) : (
          <span className="tink-current-label">
            Run a search to bookmark it
          </span>
        )}
      </div>

      <input
        className="tink-input"
        placeholder="Bookmark name"
        value={title}
        disabled={!canSave}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />

      <div className="tink-add-row">
        <select
          className="tink-select"
          value={folderId}
          disabled={!canSave}
          onChange={(e) => setFolderId(e.target.value)}
        >
          <option value="">Unfiled</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
        <button
          className="tink-btn tink-btn-primary"
          disabled={!canSave}
          onClick={save}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function NewFolder() {
  const [title, setTitle] = useState("");

  const create = async () => {
    if (!title.trim()) return;
    await addFolder(title);
    setTitle("");
  };

  return (
    <div className="tink-add-row tink-new-folder">
      <input
        className="tink-input"
        placeholder="New folder"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && create()}
      />
      <button className="tink-btn" onClick={create}>
        Add
      </button>
    </div>
  );
}
