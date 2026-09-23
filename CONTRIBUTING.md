# Engineering tools and articles

Run `python scripts/build.py` to generate the catalogue, the 18 tool pages, all registry-backed articles and sitemap. Shared styles remain in `assets/css/hub.css` and `assets/css/engineering.css`.

## Add a tool
1. Add a planned record to `assets/data/tools.json` with title, category, description, inputs and outputs. The builder generates a clearly labelled planned page.
2. Implement the pure calculation in `assets/js/engineering-math.js`, fields/formula/example in `scripts/build_engineering.py`, and the live visualization in `assets/js/engineering-tools.js`.
3. Add independently worked reference cases, boundaries and invalid-input assertions to `tests/engineering.test.js`. Add the related guide and document supported ranges and model limits.
4. The engineering-page builder marks configured tools available. Review the formula and UI before publishing; an unknown planned tool remains planned.

## Add a blog article
Write the original body in `content/articles/<slug>.html`. Register title, category, summary, date, related tool slugs and source links in `assets/data/articles.json`. The builder generates the public article, blog card and sitemap entry automatically. Preserve author identity accurately and distinguish general guides from personal project experience.

## Checks
```
python scripts/build.py
python scripts/validate.py
node tests/engineering.test.js
node --check assets/js/engineering-tools.js
```
GitHub runs checks on pushes and pull requests. GitHub Pages publishes master. Checklists save only in the current browser, under the entered record ID, and export CSV. They do not provide signatures or server storage.

## Numerical references
Pt100 uses nominal IEC 60751 coefficients (A 3.9083e-3, B -5.775e-7, C -4.183e-12), -200 to 850 °C. Thermocouples use NIST Monograph 175 positive-temperature forward polynomials for K/J/T, with bisection inversion and reference-junction compensation; configured ranges are shown in the UI. Other tools expose their equations and scope. PID is an educational first-order simulation, not field tuning or SIL analysis.
