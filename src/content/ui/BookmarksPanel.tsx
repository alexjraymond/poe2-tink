import { useMemo, useState, type DragEvent } from "react";
import type { Bookmark, BookmarksState, TradeLocation } from "../../lib/types";
import {
  addBookmark,
  addFolder,
  deleteBookmark,
  deleteFolder,
  moveBookmark,
  reorderFolders,
} from "../../lib/storage";
import { buildTradeUrl } from "../../lib/trade-location";

interface Props {
  state: BookmarksState;
  currentLocation: TradeLocation | null;
}

/** What is currently being dragged. */
type Drag =
  | { type: "folder"; id: string }
  | { type: "bookmark"; id: string; from: string | null };

/** Where a dragged item would land relative to the row under the cursor. */
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
  if (targetIndex === -1) return without;
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

  // All drag state lives here so a bookmark can be dropped into another folder.
  const [drag, setDrag] = useState<Drag | null>(null);
  const [folderLine, setFolderLine] = useState<DropTarget | null>(null);
  const [rowLine, setRowLine] = useState<
    ({ folderId: string | null } & DropTarget) | null
  >(null);
  const [folderHover, setFolderHover] = useState<{ folderId: string | null } | null>(
    null
  );

  const clearDrag = () => {
    setDrag(null);
    setFolderLine(null);
    setRowLine(null);
    setFolderHover(null);
  };

  const idsIn = (folderId: string | null) =>
    (byFolder.get(folderId ?? "") ?? []).map((b) => b.id);

  // Folder reordering.
  const dropFolder = (targetId: string, after: boolean) => {
    if (drag?.type === "folder") {
      void reorderFolders(
        reorder(folders.map((f) => f.id), drag.id, targetId, after)
      );
    }
    clearDrag();
  };

  // Bookmark dropped onto a specific row (reorder, or insert when cross-folder).
  const dropOnRow = (
    folderId: string | null,
    targetId: string,
    after: boolean
  ) => {
    if (drag?.type === "bookmark") {
      void moveBookmark(
        drag.id,
        folderId,
        reorder(idsIn(folderId), drag.id, targetId, after)
      );
    }
    clearDrag();
  };

  // Bookmark dropped onto a folder header / empty area: append to that folder.
  const dropInFolder = (folderId: string | null) => {
    if (drag?.type === "bookmark") {
      const rest = idsIn(folderId).filter((id) => id !== drag.id);
      void moveBookmark(drag.id, folderId, [...rest, drag.id]);
    }
    clearDrag();
  };

  const openBookmark = (bookmark: Bookmark) => {
    window.location.href = buildTradeUrl(bookmark);
  };

  const renderBookmarks = (folderId: string | null) => {
    const list = byFolder.get(folderId ?? "") ?? [];

    if (list.length === 0) {
      const active =
        drag?.type === "bookmark" && folderHover?.folderId === folderId;
      return (
        <p
          className={`tink-empty tink-empty-sm tink-dropzone ${
            active ? "tink-dropzone-active" : ""
          }`}
          onDragOver={(e) => {
            if (drag?.type !== "bookmark") return;
            e.preventDefault();
            setFolderHover({ folderId });
          }}
          onDrop={(e) => {
            e.preventDefault();
            dropInFolder(folderId);
          }}
        >
          Empty
        </p>
      );
    }

    return (
      <ul className="tink-bookmarks">
        {list.map((bookmark) => {
          const isDragging = drag?.type === "bookmark" && drag.id === bookmark.id;
          const line =
            rowLine && rowLine.folderId === folderId && rowLine.id === bookmark.id
              ? rowLine.after
                ? "tink-drop-after"
                : "tink-drop-before"
              : "";
          return (
            <li
              key={bookmark.id}
              className={`tink-bookmark tink-draggable ${
                isDragging ? "tink-dragging" : ""
              } ${line}`}
              draggable
              onDragStart={(e) => {
                setDrag({ type: "bookmark", id: bookmark.id, from: folderId });
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", bookmark.id);
              }}
              onDragOver={(e) => {
                if (drag?.type !== "bookmark") return;
                e.preventDefault();
                setRowLine({
                  folderId,
                  id: bookmark.id,
                  after: isAfterMidpoint(e),
                });
              }}
              onDrop={(e) => {
                e.preventDefault();
                dropOnRow(folderId, bookmark.id, isAfterMidpoint(e));
              }}
              onDragEnd={clearDrag}
            >
              <span className="tink-grip" aria-hidden="true">
                ⠿
              </span>
              <button
                className="tink-bookmark-open"
                title={`${bookmark.league} · ${bookmark.kind}`}
                onClick={() => openBookmark(bookmark)}
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
  };

  const hasNothing =
    folders.length === 0 && (byFolder.get("")?.length ?? 0) === 0;

  return (
    <div className="tink-panel">
      <header className="tink-header">
        <span className="tink-logo">⚒</span>
        <h1>POE2 Tink</h1>
      </header>

      <AddCurrentSearch currentLocation={currentLocation} folders={folders} />

      <NewFolder />

      <div className="tink-list">
        {hasNothing && (
          <p className="tink-empty">
            No bookmarks yet. Run a search, then save it above.
          </p>
        )}

        {folders.map((folder) => {
          const dragging = drag?.type === "folder" && drag.id === folder.id;
          const reorderLine =
            drag?.type === "folder" && folderLine?.id === folder.id
              ? folderLine.after
                ? "tink-drop-after"
                : "tink-drop-before"
              : "";
          const receiving =
            drag?.type === "bookmark" && folderHover?.folderId === folder.id;
          return (
            <section key={folder.id} className="tink-folder">
              <div
                className={`tink-folder-head tink-draggable ${
                  dragging ? "tink-dragging" : ""
                } ${reorderLine} ${receiving ? "tink-folder-receive" : ""}`}
                draggable
                onDragStart={(e) => {
                  setDrag({ type: "folder", id: folder.id });
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", folder.id);
                }}
                onDragOver={(e) => {
                  if (drag?.type === "folder") {
                    e.preventDefault();
                    setFolderLine({ id: folder.id, after: isAfterMidpoint(e) });
                  } else if (drag?.type === "bookmark") {
                    e.preventDefault();
                    setFolderHover({ folderId: folder.id });
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag?.type === "folder") {
                    dropFolder(folder.id, isAfterMidpoint(e));
                  } else if (drag?.type === "bookmark") {
                    dropInFolder(folder.id);
                  }
                }}
                onDragEnd={clearDrag}
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
              {renderBookmarks(folder.id)}
            </section>
          );
        })}

        {(byFolder.get("")?.length ?? 0) > 0 && (
          <section className="tink-folder">
            <div
              className={`tink-folder-head ${
                drag?.type === "bookmark" && folderHover?.folderId === null
                  ? "tink-folder-receive"
                  : ""
              }`}
              onDragOver={(e) => {
                if (drag?.type !== "bookmark") return;
                e.preventDefault();
                setFolderHover({ folderId: null });
              }}
              onDrop={(e) => {
                e.preventDefault();
                dropInFolder(null);
              }}
            >
              <span className="tink-folder-title tink-muted">Unfiled</span>
            </div>
            {renderBookmarks(null)}
          </section>
        )}
      </div>
    </div>
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
