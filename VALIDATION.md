# Validation and reproduction

Baseline: live GitHub `master`, commit `dda1a0e8995eb81861e262bb6a102c29c72dac0b`. The user selected the current live tools-first site rather than the earlier uncommitted portfolio-first package.

## Exact commands

Run from the repository root after applying the complete files:

```sh
python3 scripts/build.py
python3 scripts/validate.py
python3 tests/preservation.py
node tests/engineering.test.js
node --check assets/js/hub.js
node --check assets/js/redesign.js
node --check assets/js/engineering-math.js
node --check assets/js/engineering-tools.js
```

After committing the generated files, the existing CI's no-diff check must also pass:

```sh
python3 scripts/build.py
git diff --exit-code
```

Optional browser verification (development dependencies only; no framework or runtime package is shipped):

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/redesign.browser.cjs
node tests/performance.browser.cjs
```

If using a preinstalled Chromium executable, set `CHROMIUM_PATH` to its path. If Playwright is installed outside this checkout, set `PLAYWRIGHT_MODULE` to its module path. Browser tests start their own local servers and preserve `/satish-portfolio/` by mounting the repository beneath that path.

## Results

- 57 published HTML files passed local-link and inline-script validation.
- All 55 content pages (excluding the redirect and article template) passed browser checks at 375 × 812, 768 × 812 and 1440 × 812: no horizontal overflow or page JavaScript errors.
- All scanned HTML text met at least 4.5:1 contrast. SVG text is excluded from this automated scan; the new diagram uses high-contrast cyan/amber/white labels on navy.
- All visible link/button/input/select/textarea targets passed 44 × 44 px checks on mobile. Checkbox activation areas are measured using their clickable labels.
- The mobile hero shows the name, role and primary CTA above the bottom navigation.
- All five mobile links, the persistent contact pill, menu open/Escape close, tool search, 4–20 mA calculation and checklist persistence passed.
- With JavaScript disabled: all 55 content pages retained visible headings and navigation; the homepage retained all 18 tool cards. Interactive calculators still require JavaScript, while their formulas and examples remain readable.
- Reduced motion, image alt text, single stylesheet, local fonts, canonical tags, social tags and valid Person JSON-LD passed their checks.
- The engineering suite passed 93 numerical assertions, all voting combinations, PID limits and recovery checks.
- Both protected engineering JavaScript files and both catalogs remain byte-for-byte unchanged.
- Original main-content text remains in its original order, allowing only the three authorized metric-label substitutions and additive requested material. Project names, numeric values, articles, knowledge entries, tool descriptions, career history and contact details remain.
- The bio card contains 66 words grounded in existing content.
- Repeated full builds produce identical output. The tool/article generation order and numerical behavior are unchanged; the source restore and final visual/metadata passes are explicit additions.

## Performance

Final mobile LCP runs: **1.760 s, 1.908 s, 1.572 s**.

Profile: Chromium, 375 × 812, empty cache, 750 kbps download, 250 kbps upload, 300 ms latency and 4× CPU slowdown against a local static server. This defined 3G-style simulation meets the 2.5 s target. Actual GitHub Pages and real-device measurements may differ.

## Scope notes

The live baseline has no `/portfolio/projects/<slug>/` case-study pages or `67K+ loops commissioned` claim. No case-study narratives or sibling-project cards were invented. Projects/About navigation points to the existing career portfolio sections; no `/about/` route was added. The tools-first structure remains intact. The original hero illustration was replaced by the requested visual architecture diagram; its image asset is retained.

The authorized exceptions to the content freeze are the hero identity, 66-word bio, three scope/role metric labels, functionally independent safety diagram, navigation labels and metadata. There are no new credentials or numerical claims.

## SJ Hub v1 redesign baseline (2026-10-28)

Applied the ChatGPT redesign blueprint (full copy: `D:\Desktop\Website Redesign\ChatGPT-Reply-Full-Blueprint.txt`). New commit baseline: `ec867ef`.

- 63 published HTML pages pass local-link and inline-script validation (57 → 63: +6 field tools).
- 24 working tools: 18 validated engines (untouched, byte-identical) + 6 new P0 field tools from `assets/data/field-tools.json` + `assets/js/hub-tools.js` (61 new assertions in `tests/hub-tools.test.js`).
- Design: SJ Hub System v1, light-first (#123B5D/#087E9A/#137547/#A35B08/#B42332), dark via `prefers-color-scheme` or the header `[data-theme]` toggle; 52px controls, ≥44px targets, safe-area bottom tabs.
- PWA: `manifest.webmanifest` + `service-worker.js` (subpath scoped, offline cache, versioned `v20261028`); all shared-asset query strings bumped on change.
- CI now additionally runs `node --check assets/js/redesign.js`, `node --check assets/js/hub-tools.js` and `node tests/hub-tools.test.js`.
- Windows local note: `tests/preservation.py` hashes the four protected files as committed LF blobs; a Windows working tree (CRLF checkout) and Python's CRLF text-mode writes make the raw-hash and rebuild-snapshot assertions fail locally even when CI passes. Verify with a Linux checkout (CI) or CR-normalize; protected-file hashes were confirmed identical to baseline at commit `ec867ef`.

