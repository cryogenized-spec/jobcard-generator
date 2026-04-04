# Vanguard Blade & Bolt Workshop Paperwork Generator

Version 2 of the static paperwork generator.

## Included document types
- Stock withdrawal / issue record
- Repair job card
- Invoice

## What it does
- Keeps **Vanguard Blade & Bolt** business details fixed in the templates
- Loads **NeonSales** as the default client
- Supports **serialized** and **unserialized** line items
- Generates **LuaLaTeX** for the active document type
- Lets you **copy** the generated code in one tap
- Lets you **download** the generated code as a `.tex` file
- Works as an installable **PWA** with offline caching

## Files
- `index.html` – UI shell
- `style.css` – styling
- `app.js` – form logic, mode switching, output generation, copy/download actions
- `templates.js` – defaults plus LuaLaTeX renderers
- `manifest.json` – PWA manifest
- `sw.js` – service worker
- `icon.svg` – app icon
- `.nojekyll` – GitHub Pages compatibility

## Publish on GitHub Pages
1. Create a new GitHub repository.
2. Upload all files from this folder into the repository root.
3. Commit the files.
4. Open **Settings -> Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and the `/ (root)` folder.
7. Save.

Your app will then be available at the GitHub Pages URL for that repository.

## Change the fixed constants
Edit these in `templates.js`:
- `BUSINESS`
- `DEFAULTS`

## Notes
If you later want the invoice output to match your saved invoice template *exactly*, the current invoice renderer can be swapped out with that house template very easily.
