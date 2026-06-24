import { useEffect, useState } from "react";

export function Popup() {
  const [count, setCount] = useState(0);

  // Persist the counter in chrome.storage so it survives popup close/open.
  useEffect(() => {
    chrome.storage.local.get("count").then((result) => {
      if (typeof result.count === "number") {
        setCount(result.count);
      }
    });
  }, []);

  const increment = () => {
    setCount((prev) => {
      const next = prev + 1;
      void chrome.storage.local.set({ count: next });
      return next;
    });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <main className="popup">
      <h1>POE2 Tink</h1>
      <p className="subtitle">React + TypeScript Chrome extension</p>

      <button className="counter" onClick={increment}>
        Count is {count}
      </button>

      <button className="link" onClick={openOptions}>
        Open options
      </button>
    </main>
  );
}
