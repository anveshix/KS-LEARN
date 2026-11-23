# KS-LEARN
PERSONALISED LEARNING TOOLS FOR KIDS

**[▶ Open the app](https://anveshix.github.io/KS-LEARN/)** · [Brand board](brand/index.html) · [Architecture](docs/ARCHITECTURE.md) · [Privacy (DPDP)](docs/DPDP.md)

**Small beginnings. Lasting growth.** · छोटी शुरुआत, पक्की सीख

Offline-first mastery learning for one child, class 3–9, Hindi and English. Parental consent
and a device-local guardian account (no email, no cloud) gate the privacy actions.

- Parental consent and DPDP: [`docs/DPDP.md`](docs/DPDP.md)
- How the learning model works (BKT + scaffolding): [`docs/LEARNING.md`](docs/LEARNING.md)
- Curiosity Labs (on-device 3D models): [`docs/LABS.md`](docs/LABS.md)
- Wellbeing, daily quests and moral stories: [`docs/WELLBEING.md`](docs/WELLBEING.md)
- Stack decisions for this upgrade: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Brand board (open in a browser): [`brand/index.html`](brand/index.html)
- Brand guide: [`docs/BRAND.md`](docs/BRAND.md)
- Independent audit (engineering, pedagogy, NEP 2020): [`docs/AUDIT-2026-11.md`](docs/AUDIT-2026-11.md)
- AI-era coach design: [`docs/COACH.md`](docs/COACH.md)
- What the curriculum can honestly cover today: [`docs/CONTENT.md`](docs/CONTENT.md)
- Rebuild the logo, icons, sharing card and poster: `npm run brand`

## Folder structure

| Path | Contents |
|---|---|
| `index.html` | App entry point |
| `src/core/` | Account, consent, mastery model (BKT), guidance, i18n and audit |
| `src/content/` | Question banks, stories and lab definitions (Hindi and English) |
| `src/` (other) | Learning, coach, wellbeing and curiosity-lab modules |
| `assets/` | Icons, logos and social cards |
| `brand/` | Brand board (open in a browser) |
| `docs/` | Architecture, audit, content, privacy, security and learning-model notes |
| `tools/` | Build, audit, content-gate and end-to-end scripts |
| `tests/` | Node test suites (`npm test`) |
| `dist/` | Built output: `ks-learn.html` (single file) and `pwa/` (deployed to GitHub Pages) |

## Scripts

```bash
npm ci
npm test          # unit tests
npm run build     # writes dist/
npm run check     # content audit + tests + build + dist verification
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security or child-data concerns privately as described in [SECURITY.md](SECURITY.md). Do not add real children's names or data to issues, tests or content.

## License

[MIT](LICENSE) © 2026 anveshix

## Author

**anveshix** — [github.com/anveshix](https://github.com/anveshix)
