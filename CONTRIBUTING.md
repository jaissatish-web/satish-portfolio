# Adding tools and articles

The public site uses a shared light design in `assets/css/hub.css`, shared navigation in `templates/`, and client-side interactions in `assets/js/hub.js`. No paid API is required.

## Tools
1. Add a record to `assets/data/tools.json` with status `planned`, category, description, inputs and outputs.
2. Run `python scripts/build.py`. It creates the planned page and refreshes the catalogue automatically.
3. Implement and review the calculation, units, invalid inputs, worked examples and mobile layout. Only then change its status to `available`; the builder will preserve that implementation.
4. Run the build and validation commands below before committing.

## Blog
Create a draft with:

```
python scripts/new_article.py loop-checking --title "A practical loop-check guide" --summary "What to prepare and how to record results."
```

Edit `_drafts/loop-checking.html`, verify technical claims and sources, then move the finished file to `blog/`. Add an article card in `blog/index.html` using the existing `article-card`, `data-tool-card` and `data-category` attributes. Add its URL to the sitemap list in `scripts/build.py`. Drafts are excluded from publishing. Run the builder to refresh shared navigation and fonts.

## Before publishing

```
python scripts/build.py
python scripts/validate.py
node --check assets/js/hub.js
```

GitHub runs these checks on pushes and pull requests. GitHub Pages publishes the master branch. Checks report failures without rewriting files or changing the theme. Review the check result and the Pages deployment before announcing an update.
