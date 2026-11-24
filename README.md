# Maiza Events — 3D landing page template

Static HTML/CSS/JS. Double-click `index.html` to open it, or run a local server:

Local server (needs Python 3):

- Windows: double-click `start-windows.bat`
- Mac / Linux: `./start-mac-linux.sh`

Then open http://localhost:8000. People on the same Wi-Fi can open `http://<your computer's IP>:8000`.

- `index.html` — content and sections
- `css/style.css` — design tokens (colours, fonts) at the top
- `js/scene.js` — WebGL stage source (three.js, vendored in `vendor/`). The page loads `js/scene.bundle.js`; after editing `scene.js`, run `./build.sh` (needs esbuild) to rebuild it
- `js/main.js` — interactions, gallery ring, form (front-end only; connect to your backend or form service)
- `assets/img/` — AI-generated placeholder photos; replace with real event photos

Fonts load from Google Fonts.
