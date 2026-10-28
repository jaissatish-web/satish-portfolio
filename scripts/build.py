"""Deterministic static-site builder. One catalogue and shared page templates."""
from pathlib import Path
from string import Template
from html import escape
import json,re
ROOT=Path(__file__).resolve().parents[1]
CATEGORIES={'signal':'Signal & calibration','process':'Flow & process','temperature':'Temperature','electrical':'Electrical','safety':'Safety logic','commissioning':'Commissioning'}
KINDS=[('all','All tools'),('calculate','Calculate'),('troubleshoot','Troubleshoot'),('reference','Reference'),('checklist','Checklist')]
KIND_LABEL=dict(KINDS[1:])
CHECKLIST_SLUGS={'loop-checklist','fat-sat-checklist','cause-effect-checklist'}
def build():
    from build_redesign import prepare_sources, header as shared_header
    prepare_sources()
    from build_engineering import build as build_tools
    from build_articles import build as build_articles
    build_tools()
    build_articles()
    rows=json.loads((ROOT/'assets/data/tools.json').read_text())
    field_rows=json.loads((ROOT/'assets/data/field-tools.json').read_text())
    header=shared_header()
    footer=(ROOT/'templates/footer.html').read_text().strip()
    template=Template((ROOT/'templates/tool.html').read_text())
    for tool in rows:
        if tool['status']!='planned':continue
        context={k:escape(str(tool[k])) for k in ['title','description','icon']}
        context.update(category=escape(CATEGORIES[tool['category']]),inputs=''.join('<li>'+escape(x)+'</li>' for x in tool['inputs']),outputs=''.join('<li>'+escape(x)+'</li>' for x in tool['outputs']),header=header,footer=footer)
        (ROOT/'tools'/f"{tool['slug']}.html").write_text(template.substitute(context))
    def _kind(slug):
        return 'checklist' if slug in CHECKLIST_SLUGS else 'calculate'
    def _card(t, kind):
        aliases = (' data-aliases="' + escape(' '.join(t.get('aliases', []))) + '"') if t.get('aliases') else ''
        return (f'<a class="tool-card" data-tool-card data-kind="{kind}" data-category="{t["category"]}"'
                f' data-status="{t.get("status", "available")}"{aliases} href="tools/{t["slug"]}.html">'
                f'<div class="tool-card-top"><span class="tool-icon">{escape(t["icon"])}</span>'
                f'<span class="kind-pill">{KIND_LABEL[kind]}</span></div>'
                f'<h3>{escape(t["title"])}</h3><p>{escape(t["description"])}</p>'
                f'<div class="tool-meta"><span class="status">Available</span>'
                f'<span class="tool-link">Open tool →</span></div></a>')
    cards = ''.join(_card(t, _kind(t['slug'])) for t in rows if t['status'] == 'available')
    cards += ''.join(_card(t, t['kind']) for t in field_rows)
    total = sum(1 for t in rows if t['status'] == 'available') + len(field_rows)
    filters = '<div class="filters" aria-label="Tool categories"><button type="button" class="filter active" data-filter="all" aria-pressed="true">All</button>' + ''.join(f'<button type="button" class="filter" data-filter="{k}" aria-pressed="false">{v}</button>' for k, v in KINDS[1:]) + '</div>'
    catalogue = (f'<div class="workspace-toolbar"><span class="catalogue-count">{total} free tools · No sign-up · Offline-capable</span>'
                 f'<label><input type="checkbox" id="ready-only"> Show available tools only</label></div>' + filters +
                 '<div class="tool-grid">' + cards + '</div>')
    home=ROOT/'index.html';s=home.read_text()
    s=re.sub(r'<!-- CATALOGUE:START -->.*?<!-- CATALOGUE:END -->','<!-- CATALOGUE:START -->\n'+catalogue+'\n<!-- CATALOGUE:END -->',s,flags=re.S)
    home.write_text(s)
    # Refresh shared navigation/footer on every published page. Templates are not public pages.
    pages=[ROOT/'index.html']+list((ROOT/'tools').glob('*.html'))+list((ROOT/'blog').glob('*.html'))+list((ROOT/'knowledge').rglob('*.html'))+list((ROOT/'portfolio').glob('*.html'))
    for p in pages:
        if p.name=='article-template.html':continue
        s=p.read_text()
        if 'http-equiv="refresh"' in s:continue
        s=re.sub(r'<a class="skip-link".*?</a>\s*','',s,flags=re.S)
        s=re.sub(r'<header class="site-header">.*?</header>',lambda _:header,s,flags=re.S)
        s=s.replace('<div id="header-placeholder"></div>',header)
        s=re.sub(r'<footer class="site-footer">.*?</footer>(\s*<nav class="mobile-nav".*?</nav>)?',lambda _:footer,s,flags=re.S)
        s=s.replace('<div id="footer-placeholder"></div>',footer)
        s=re.sub(r'<script[^>]*src="[^\"]*components.js"[^>]*></script>','',s)
        s=s.replace('loadComponents();','')
        if 'assets/js/hub.js' not in s:s=s.replace('</body>','<script src="/satish-portfolio/assets/js/hub.js"></script></body>')
        if '<main' in s and 'id="main-content"' not in s:s=s.replace('<main','<main id="main-content"',1)
        s=re.sub(r'(assets/(?:css/hub.css|js/hub.js))(?:\?v=[^"]*)?', r'\1?v=20261028b', s)
        p.write_text(s)
    urls=['','portfolio/','knowledge/','blog/']+[f"tools/{t['slug']}.html" for t in rows if t['status']=='available']+[f"blog/{a['slug']}.html" for a in json.loads((ROOT/'assets/data/articles.json').read_text())]
    (ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>https://jaissatish-web.github.io/satish-portfolio/'+u+'</loc></url>' for u in urls)+'</urlset>\n')
    print(f'Built {len(rows)} working tools, article library, shared navigation and sitemap.')
if __name__=='__main__':
    build()
    from build_hub_tools import build as build_field_tools
    build_field_tools()
    from build_redesign import build as build_redesign
    build_redesign()
