# Instrumentation Hub — Satish Kumar Jaiswal

A mobile-first instrumentation engineering resource combining free field tools, practical learning, engineering articles, and Satish's professional portfolio.

**Live site:** https://jaissatish-web.github.io/satish-portfolio/

## Site structure

- `/` — tools-first homepage and tool discovery
- `/tools/` — free calculators, simulators, and commissioning checklists
- `/knowledge/` — structured instrumentation knowledge library
- `/blog/` — practical field articles and reusable article template
- `/portfolio/` — Satish Kumar Jaiswal's experience, projects, skills, and contact details

## Available tools

- 4–20 mA converter and reverse scaling
- DP flow calculator
- Five-point calibration generator
- 2oo3 voting-logic simulator
- Loop-check checklist with local progress saving
- Pressure and temperature unit converter

## Adding a new tool

Copy an existing file under `tools/`, keep the shared `assets/css/redesign.css` and `assets/js/hub.js` references, then add its card to the homepage tool grid. Every tool should include:

1. A short purpose statement
2. Clearly labelled inputs
3. A live result with units
4. The formula or operating assumption
5. Engineering notes and limitations
6. Mobile-friendly controls

## Adding a blog article

Copy `blog/article-template.html`, replace the metadata and article content, and add the article card to `blog/index.html`. Articles use the same navigation, typography, surfaces, and responsive layout as the tool pages.

## Technology

Static HTML, CSS, and JavaScript hosted on GitHub Pages. The current tools run entirely in the browser and require no account or API.

## Visual redesign and source files

The live tools-first structure is retained. `assets/css/redesign.css` is the only stylesheet served by public pages; Inter and JetBrains Mono are local font subsets. All authored pages have canonical sources under `content/pages/`. Edit those sources, shared templates, or the relevant generator and run `python3 scripts/build.py`; do not hand-edit generated output.

`templates/header.html` has an explicitly marked shared-head block and a body-navigation fragment. `scripts/build_redesign.py` injects expanded metadata only into each page's `<head>` and gives the body fragment to the existing builders. The tool and article generation order and calculations remain unchanged.

`VALIDATION.md` contains exact verification commands and test limits. The request was applied to the existing live site, which has a career portfolio rather than individual `/portfolio/projects/<slug>/` pages. Projects and About links target its existing sections. No new case-study narratives, routes, or metrics were fabricated.
