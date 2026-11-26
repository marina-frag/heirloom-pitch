# Heirloom · pitch site

Static one-page pitch for the Lab to Market application: a farm-decision platform for people who inherit farmland, powered by a low-cost LoRa digital twin.

- `index.html` – content
- `style.css` – styles (light/dark)
- `js/twin.js` – three.js digital-twin hero (three@0.160.0 from jsDelivr, no install)
- `js/main.js` – decision mock-up, animated architecture, positioning chart, contact config

## Run locally

```bash
npm start        # serves on http://localhost:8080
```

ES modules need a server; opening `index.html` directly from disk won't load the 3D scene.

## Edit before sharing

In `js/main.js`, set `CONFIG.signupUrl` (Tally / Google Form) and `CONFIG.contactEmail`.

## Deploy on GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / root.
