# TOPPING Surround Controller

Professional surround-controller UI prototype for TOPPING audio devices. The app runs as a Vite + React web project and uses local mock device data during development.

## Run

```bash
npm install
npm run dev
```

Local dev server:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

Production output is written to `out/web/`.

## Project Layout

```text
src/                         app source
docs/                        design and implementation notes
skills/                      local workflow skills used during development
artifacts/screenshots/eq/    EQ screenshots and visual references
dev/                         experiments, exported modules, scratch tools, notes
out/                         generated build and report outputs
```

`package.json` contains the active run commands. Electron-specific runtime files have been removed from the active app path.
