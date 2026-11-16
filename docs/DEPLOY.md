# Deploy (तैनाती)

`npm ci && npm run check` must pass first (content audit → unit tests → build → dist verification). `npm run e2e` runs the browser test when Playwright is installed.

| Target | Steps | Offline | Security headers |
|---|---|---|---|
| **Single file** | Copy `dist/ks-learn.html` to the device and open it. | Yes | In-page policy |
| **Cloudflare Pages / Netlify** (recommended) | Publish `dist/pwa` as the site root. `_headers` is applied automatically. Open the URL on the phone → "Add to Home screen". | Yes, after first visit | Full (`_headers`) |
| **GitHub Pages** | Push to `main`; `.github/workflows/pages.yml` publishes `dist/pwa`. Set Settings → Pages → Source: GitHub Actions. Keep the repository **private** if the nickname or location must stay private; the app itself holds no personal data. | Yes, after first visit | In-page policy only |

After deploying: open the site once online, switch to aeroplane mode, reopen. It must load. Then Parent → Backup → save a file; restore it on the second device.

**Updating:** bump `version` in `package.json`, deploy. Devices pick up the new version on the next online visit; progress is kept (state format `v: 2`, sanitised on load).

**Data location:** progress lives in the browser's storage for that site address. Changing the address (file → hosted, or a new domain) starts empty: move progress with a backup file. Clearing browsing data erases it, so save a backup weekly.
