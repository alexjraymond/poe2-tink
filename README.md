# POE2 Tink

A Google Chrome extension skeleton built with **React**, **TypeScript**, and **Vite** (using [CRXJS](https://crxjs.dev/) for Manifest V3 + HMR).

## Stack

- Manifest V3
- React 18 + TypeScript
- Vite 5 + `@crxjs/vite-plugin`

## Project structure

```
.
├── src/
│   ├── manifest.ts          # Typed MV3 manifest definition
│   ├── background/
│   │   └── index.ts         # Background service worker
│   ├── content/
│   │   └── index.ts         # Content script (injected into pages)
│   ├── popup/               # Toolbar popup (React)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── Popup.tsx
│   │   └── popup.css
│   ├── options/             # Options page (React)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── Options.tsx
│   │   └── options.css
│   └── vite-env.d.ts
├── public/
│   └── icons/               # Extension icons (16 / 48 / 128 px)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Getting started

Install dependencies:

```bash
npm install
```

### Development (with HMR)

```bash
npm run dev
```

Then load the unpacked extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the generated `dist/` folder

The dev server provides hot-module reloading for the popup, options page, and content scripts.

### Production build

```bash
npm run build
```

The bundled extension is output to `dist/`, ready to load unpacked or zip for the Chrome Web Store.

## Notes

- Permissions are declared in `src/manifest.ts` (currently `storage` and `activeTab`).
- The popup persists a counter via `chrome.storage.local`; the options page persists settings via `chrome.storage.sync`.
- Replace the placeholder icons in `public/icons/` with your own artwork.
