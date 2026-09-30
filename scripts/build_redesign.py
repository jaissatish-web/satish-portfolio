"""Source-driven visual enhancement. Never changes engineering calculation code.

Header.html contains separate head/body regions: metadata is expanded into <head>,
while only the body fragment is supplied to existing tool/article generators.
"""
from pathlib import Path
from html import escape, unescape
from string import Template
import json,re
ROOT=Path(__file__).resolve().parents[1]
BASE='/satish-portfolio/'
ORIGIN='https://jaissatish-web.github.io'

def header():
    return (ROOT/'templates/header.html').read_text().split('<!-- SHARED-HEAD:END -->',1)[1].strip()

def prepare_sources():
    """Restore authored source pages; generated tools/articles still use original builders."""
    for source in (ROOT/'content/pages').rglob('*.html'):
        dest=ROOT/source.relative_to(ROOT/'content/pages')
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(source.read_text())

def metadata(page, text):
    title=unescape(re.search(r'<title>(.*?)</title>',text,re.S).group(1))
    desc=re.search(r'<meta\s+name="description"\s+content="([^"]*)"',text)
    description=unescape(desc.group(1)) if desc else title
    path=page.relative_to(ROOT).as_posix()
    url=ORIGIN+BASE+(path[:-10] if path.endswith('index.html') else path)
    person={'@context':'https://schema.org','@type':'Person','name':'Satish Kumar Jaiswal','jobTitle':'Lead Instrumentation & Control Engineer','url':ORIGIN+BASE+'portfolio/','sameAs':['https://www.linkedin.com/in/jaissatish/'],'knowsAbout':['Instrumentation','Control systems','Commissioning','Maintenance','DCS','SIS','ESD','PLC','SCADA','FAT/SAT','Loop checking']}
    template=(ROOT/'templates/header.html').read_text().split('<!-- SHARED-HEAD:START -->',1)[1].split('<!-- SHARED-HEAD:END -->',1)[0]
    return Template(template).substitute(title=escape(title,quote=True),description=escape(description,quote=True),url=escape(url,quote=True),person_json=json.dumps(person,ensure_ascii=False).replace('<','\\u003c'))

def build():
    pages=[ROOT/'index.html']+[p for folder in ['tools','portfolio','knowledge','blog'] for p in (ROOT/folder).rglob('*.html')]
    for page in pages:
        text=page.read_text()
        if 'http-equiv="refresh"' in text:continue
        # Remove old stylesheet/font links; a single local stylesheet owns all page styling.
        text=re.sub(r'<link\b[^>]*(?:rel="stylesheet"|fonts.googleapis.com|fonts.gstatic.com)[^>]*>','',text)
        text=re.sub(r'<meta name="theme-color"[^>]*>','',text)
        text=re.sub(r'<meta name="viewport"[^>]*>','<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',text)
        text=re.sub(r'<!-- PAGE-METADATA:START -->.*?<!-- PAGE-METADATA:END -->','',text,flags=re.S)
        head=f'<meta name="theme-color" content="#0A0E17"><link rel="stylesheet" href="{BASE}assets/css/redesign.css">'
        text=text.replace('</head>',head+'<!-- PAGE-METADATA:START -->'+metadata(page,text)+'<!-- PAGE-METADATA:END --></head>')
        # Navigation is static: visible with JS off, collapsed only after enhancement loads.
        text=re.sub(r'<a class="skip-link".*?</a>\s*','',text,flags=re.S)
        text=re.sub(r'<header class="site-header">.*?</header>',lambda _:header(),text,flags=re.S)
        text=re.sub(r'<footer class="site-footer">.*?</footer>(\s*<nav class="mobile-nav".*?</nav>)?',lambda _:(ROOT/'templates/footer.html').read_text(),text,flags=re.S)
        if 'assets/js/redesign.js' not in text:text=text.replace('</body>',f'<script defer src="{BASE}assets/js/redesign.js"></script></body>')
        # Every existing image is nonessential to initial textual content and can load lazily.
        text=re.sub(r'<img\b(?![^>]*\bloading=)', '<img loading="lazy" decoding="async"',text)
        if 'id="engineering-app"' in text and '<noscript>' not in text:
            text=text.replace('<div class="container engineering-app"','<noscript><p class="container callout">Interactive calculations require JavaScript. Formulas and worked examples below remain available.</p></noscript><div class="container engineering-app"')
        page.write_text(text)
    print('Applied one local dark theme, mobile navigation and shared metadata.')

if __name__=='__main__':build()
