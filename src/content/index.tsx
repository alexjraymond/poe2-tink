// Content-script entry point.
//
// Responsibilities (kept deliberately thin):
//   1. Make sure we only mount once.
//   2. Create a host element + Shadow DOM so our styles are isolated from the
//      trade site (and vice-versa).
//   3. Inject our CSS into the shadow root and mount the React app.
//
// The `?inline` query tells Vite to give us the CSS as a string instead of
// injecting it into the page <head>. We need the string so we can put it inside
// the shadow root.

import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import css from "./content.css?inline";

const HOST_ID = "poe2-tink-root";

function mount() {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  createRoot(mountPoint).render(<App />);
}

mount();
