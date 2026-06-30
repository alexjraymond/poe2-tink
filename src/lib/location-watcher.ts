// The trade site is a single-page app: running a search updates the URL via
// history.pushState() WITHOUT a full page reload. A plain content script only
// runs once on load, so we have to actively watch for these URL changes to keep
// our "current search" in sync.
//
// Strategy: monkey-patch pushState/replaceState + listen for popstate, with a
// low-frequency interval as a safety net.

export function watchLocation(onChange: (href: string) => void): () => void {
  let last = window.location.href;

  const emitIfChanged = () => {
    if (window.location.href !== last) {
      last = window.location.href;
      onChange(last);
    }
  };

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    emitIfChanged();
    return result;
  };
  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    emitIfChanged();
    return result;
  };

  window.addEventListener("popstate", emitIfChanged);
  const intervalId = window.setInterval(emitIfChanged, 1000);

  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener("popstate", emitIfChanged);
    window.clearInterval(intervalId);
  };
}
