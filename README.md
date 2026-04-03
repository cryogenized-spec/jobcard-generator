# Vanguard Blade & Bolt — Job Card Generator

A tiny static HTML/CSS/JavaScript generator that fills your fixed Vanguard Blade & Bolt house template and outputs LuaLaTeX source for repair job cards.

## Files

- `index.html` — app UI
- `style.css` — styling
- `templates.js` — business constants, defaults, LaTeX renderer
- `app.js` — form logic, add/remove assets, copy/download output
- `.nojekyll` — tells GitHub Pages to serve the site directly without Jekyll processing

## Fixed constants

These are hard-coded in `templates.js`:

- Business name
- Issued by
- Business address
- Business email

## Default placeholders

Also set in `templates.js`:

- NeonSales name/contact/address
- default materials list
- two demo assets

## Suggested repo contents

```text
jobcard-generator/
  index.html
  style.css
  app.js
  templates.js
  .nojekyll
  README.md
```
