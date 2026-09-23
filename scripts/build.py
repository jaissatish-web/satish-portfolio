"""Deterministic static-site builder. One catalogue and shared page templates."""
from pathlib import Path
from string import Template
from html import escape
import json,re
ROOT=Path(__file__).resolve().parents[1]
CATEGORIES={'signal':'Signal & calibration','process':'Flow & process','temperature':'Temperature','electrical':'Electrical','safety':'Safety logic','commissioning':'Commissioning'}
def build():
    rows=json.loads((ROOT/'assets/data/tools.json').read_text())
    header=(ROOT/'templates/header.html').read_text().strip()
    footer=(ROOT/'templates/footer.html').read_text().strip()
    template=Template((ROOT/'templates/tool.html').read_text())
    for tool in rows:
        if tool['status']!='planned':continue
        context={k:escape(str(tool[k])) for k in ['title','description','icon']}
        context.update(category=escape(CATEGORIES[tool['category']]),inputs=''.join('<li>'+escape(x)+'</li>' for x in tool['inputs']),outputs=''.join('<li>'+escape(x)+'</li>' for x in tool['outputs']),header=header,footer=footer)
        (ROOT/'tools'/f"{tool['slug']}.html").write_text(template.substitute(context))
    filters='<div class="filters" aria-label="Tool categories"><button type="button" class="filter active" data-filter="all" aria-pressed="true">All tools</button>'+''.join(f'<button type="button" class="filter" data-filter="{k}" aria-pressed="false">{escape(v)}</button>' for k,v in CATEGORIES.items())+'</div>'
    ready=sum(t['status']=='available' for t in rows)
    cards=[]
    for t in rows:
        active=t['status']=='available'
        cards.append(f'''<a class="tool-card {'planned-card' if not active else ''}" data-tool-card data-category="{t['category']}" data-status="{t['status']}" href="tools/{t['slug']}.html"><span class="tool-icon">{escape(t['icon'])}</span><h3>{escape(t['title'])}</h3><p>{escape(t['description'])}</p><div class="tool-meta"><span class="status {'coming' if not active else ''}">{'Ready to use' if active else 'Planned'}</span><span class="tool-link">{'Open tool' if active else 'View plan'} →</span></div></a>''')
    catalogue=f'<div class="workspace-toolbar"><span class="catalogue-count">{ready} ready to use · {len(rows)-ready} planned</span><label><input type="checkbox" id="ready-only"> Show ready tools only</label></div>'+filters+'<div class="tool-grid">'+''.join(cards)+'</div>'
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
        if 'fonts.googleapis.com/css2' not in s:s=s.replace('</head>','<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"></head>')
        p.write_text(s)
    urls=['','portfolio/','knowledge/','blog/']+[f"tools/{t['slug']}.html" for t in rows if t['status']=='available']+['blog/5-point-transmitter-calibration.html']
    (ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>https://jaissatish-web.github.io/satish-portfolio/'+u+'</loc></url>' for u in urls)+'</urlset>\n')
    print(f'Built {len(rows)} catalogue entries, {len(rows)-ready} planned pages, shared navigation and sitemap.')
if __name__=='__main__':build()
