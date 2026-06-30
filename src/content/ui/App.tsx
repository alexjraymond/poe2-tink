import { useEffect, useState } from "react";
import { emptyState, type BookmarksState, type TradeLocation } from "../../lib/types";
import { getState, subscribe } from "../../lib/storage";
import { parseTradeLocation } from "../../lib/trade-location";
import { watchLocation } from "../../lib/location-watcher";
import { BookmarksPanel } from "./BookmarksPanel";

/**
 * Top-level content-script component.
 *
 * It owns two pieces of "live" external state and feeds them into the panel:
 *   - the persisted bookmarks (synced via chrome.storage.onChanged)
 *   - the current trade-page location (synced via the location watcher)
 */
export function App() {
  const [state, setState] = useState<BookmarksState>(emptyState());
  const [location, setLocation] = useState<TradeLocation | null>(() =>
    parseTradeLocation(window.location.href)
  );
  const [open, setOpen] = useState(true);

  // Load bookmarks once, then keep them in sync with storage changes.
  useEffect(() => {
    let active = true;
    getState().then((s) => {
      if (active) setState(s);
    });
    const unsubscribe = subscribe(setState);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Keep the "current search" in sync as the SPA navigates.
  useEffect(() => {
    const unwatch = watchLocation((href) => {
      setLocation(parseTradeLocation(href));
    });
    return unwatch;
  }, []);

  return (
    <div className={`tink-root ${open ? "is-open" : "is-closed"}`}>
      <button
        className="tink-toggle"
        onClick={() => setOpen((v) => !v)}
        title={open ? "Hide bookmarks" : "Show bookmarks"}
      >
        {open ? "›" : "‹"}
      </button>

      {open && (
        <BookmarksPanel
          state={state}
          currentLocation={location}
        />
      )}
    </div>
  );
}
