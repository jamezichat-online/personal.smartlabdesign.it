# Editor checks

Requires Node.js, Playwright and Chromium (with WebGL support).

```sh
node appartamento-3d/tests/controls.cjs
CHROME_PATH=/path/to/chrome node appartamento-3d/tests/garage-access.cjs
CHROME_PATH=/path/to/chrome node appartamento-3d/tests/tv-accessories.cjs
CHROME_PATH=/path/to/chrome node appartamento-3d/tests/scrolling.cjs
CHROME_PATH=/path/to/chrome node appartamento-3d/tests/workspace.cjs
```

Playwright resolves from `CODEX_PRIMARY_RUNTIME_NODE_MODULES` when set, otherwise the normal Node module path. `SCREENSHOT_DIR` optionally captures desktop, tablet and phone screenshots. The browser suite disables continuous animation and idle loading, and uses the fast rendering preset to keep software WebGL practical in CI. It exercises real scene/project objects, panel interaction, local storage, import/export and mobile navigation. The control fixture records the identifiers of the preceding editor so moving a control cannot silently remove it.
