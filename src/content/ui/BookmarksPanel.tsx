import { useMemo, useState, type DragEvent } from "react";
import type { Bookmark, BookmarksState, TradeLocation } from "../../lib/types";
import {
  addBookmark,
  addFolder,
  deleteBookmark,
  deleteFolder,
  reorderBookmarks,
  reorderFolders,
} from "../../lib/storage";
import { buildTradeUrl } from "../../lib/trade-location";

interface Props {
  state: BookmarksState;
  currentLocation: TradeLocation | null;
}

/** Where a dragged item would land relative to the item under the cursor. */
interface DropTarget {
  id: string;
  after: boolean;
}

/** Move `draggedId` to just before/after `targetId` within an ordered id list. */
function reorder(
  ids: string[],
  draggedId: string,
  targetId: string,
  after: boolean
): string[] {
  const without = ids.filter((id) => id !== draggedId);
  const targetIndex = without.indexOf(targetId);
  if (targetIndex === -1) return ids;
  without.splice(after ? targetIndex + 1 : targetIndex, 0, draggedId);
  return without;
}

/** True if the cursor is in the lower half of the row being dragged over. */
function isAfterMidpoint(event: DragEvent<HTMLElement>): boolean {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY - rect.top > rect.height / 2;
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

  // Folder drag state lives here because reordering spans the whole folder list.
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [folderDropTarget, setFolderDropTarget] = useState<DropTarget | null>(
    null
  );

  const clearFolderDrag = () => {
    setDraggingFolderId(null);
    setFolderDropTarget(null);
  };

  const handleFolderDrop = (targetId: string) => {
    if (!draggingFolderId || !folderDropTarget) return clearFolderDrag();
    const next = reorder(
      folders.map((f) => f.id),
      draggingFolderId,
      targetId,
      folderDropTarget.after
    );
    void reorderFolders(next);
    clearFolderDrag();
  };

  const openBookmark = (bookmark: Bookmark) => {
    window.location.href = buildTradeUrl(bookmark);
  };

  return (
    <div className="tink-panel">
      <header className="tink-header">
        <span className="tink-logo">⚒</span>
        <h1>POE2 Tink</h1>
      </header>

      <AddCurrentSearch currentLocation={currentLocation} folders={folders} />

      <NewFolder />

      <div className="tink-list">
        {folders.length === 0 && (byFolder.get("")?.length ?? 0) === 0 && (
          <p className="tink-empty">
            No bookmarks yet. Run a search, then save it above.
          </p>
        )}

        {folders.map((folder) => {
          const isDragging = draggingFolderId === folder.id;
          const dropHint =
            folderDropTarget?.id === folder.id
              ? folderDropTarget.after
                ? "tink-drop-after"
                : "tink-drop-before"
              : "";
          return (
            <section key={folder.id} className="tink-folder">
              <div
                className={`tink-folder-head tink-draggable ${
                  isDragging ? "tink-dragging" : ""
                } ${dropHint}`}
                draggable
                onDragStart={(e) => {
                  setDraggingFolderId(folder.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", folder.id);
                }}
                onDragOver={(e) => {
                  if (!draggingFolderId) return;
                  e.preventDefault();
                  setFolderDropTarget({
                    id: folder.id,
                    after: isAfterMidpoint(e),
                  });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFolderDrop(folder.id);
                }}
                onDragEnd={clearFolderDrag}
              >
                <span className="tink-grip" aria-hidden="true">
                  ⠿
                </span>
                <span className="tink-folder-title">{folder.title}</span>
                <button
                  className="tink-icon-btn"
                  title="Delete folder"
                  onClick={() => deleteFolder(folder.id)}
                >
                  ✕
                </button>
              </div>
              <SortableBookmarks
                folderId={folder.id}
                bookmarks={byFolder.get(folder.id) ?? []}
                onOpen={openBookmark}
              />
            </section>
          );
        })}

        {(byFolder.get("")?.length ?? 0) > 0 && (
          <section className="tink-folder">
            <div className="tink-folder-head">
              <span className="tink-folder-title tink-muted">Unfiled</span>
            </div>
            <SortableBookmarks
              folderId={null}
              bookmarks={byFolder.get("") ?? []}
              onOpen={openBookmark}
            />
          </section>
        )}
      </div>
    </div>
  );
}

/**
 * A bookmark list that supports drag-and-drop reordering within itself.
 * Drag state is local because reordering never crosses folder boundaries.
 */
function SortableBookmarks({
  folderId,
  bookmarks,
  onOpen,
}: {
  folderId: string | null;
  bookmarks: Bookmark[];
  onOpen: (b: Bookmark) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const clearDrag = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  if (bookmarks.length === 0) {
    return <p className="tink-empty tink-empty-sm">Empty</p>;
  }

  const handleDrop = (targetId: string) => {
    if (!draggingId || !dropTarget) return clearDrag();
    const next = reorder(
      bookmarks.map((b) => b.id),
      draggingId,
      targetId,
      dropTarget.after
    );
    void reorderBookmarks(folderId, next);
    clearDrag();
  };

  return (
    <ul className="tink-bookmarks">
      {bookmarks.map((bookmark) => {
        const isDragging = draggingId === bookmark.id;
        const dropHint =
          dropTarget?.id === bookmark.id
            ? dropTarget.after
              ? "tink-drop-after"
              : "tink-drop-before"
            : "";
        return (
          <li
            key={bookmark.id}
            className={`tink-bookmark tink-draggable ${
              isDragging ? "tink-dragging" : ""
            } ${dropHint}`}
            draggable
            onDragStart={(e) => {
              setDraggingId(bookmark.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", bookmark.id);
            }}
            onDragOver={(e) => {
              if (!draggingId) return;
              e.preventDefault();
              setDropTarget({ id: bookmark.id, after: isAfterMidpoint(e) });
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(bookmark.id);
            }}
            onDragEnd={clearDrag}
          >
            <span className="tink-grip" aria-hidden="true">
              ⠿
            </span>
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
        );
      })}
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
