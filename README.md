# Vanguard Blade & Bolt Job Card Generator

Static HTML/CSS/JavaScript generator for workshop job cards.

## Features
- Installable PWA
- Works offline after first load
- NeonSales prefilled by default
- Supports serialized and unserialized assets
- Outputs LuaLaTeX source for Overleaf or local compile
- Autosaves form state locally in the browser

## Files
- `index.html` — app shell
- `style.css` — UI styling
- `app.js` — dynamic form logic, autosave, PWA install handling
- `templates.js` — LaTeX template generation and fixed business constants
- `manifest.json` — PWA manifest
- `sw.js` — service worker for offline caching
- `icon.svg` — current app icon
- `.nojekyll` — keeps GitHub Pages simple

## Publish on GitHub Pages
1. Create a GitHub repository, for example `jobcard-generator`.
2. Upload every file in this folder to the repository root.
3. Commit the files.
4. Open **Settings -> Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Choose the `main` branch and `/ (root)`.
7. Save.
8. Wait for the Pages URL to appear.

## Business constants
The workshop identity is fixed in `templates.js` under the `BUSINESS` object.

## Default client placeholders
NeonSales defaults are in `templates.js` under the `DEFAULTS` object.
