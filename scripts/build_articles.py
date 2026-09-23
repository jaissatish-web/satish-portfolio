from pathlib import Path
from html import escape as E
from string import Template
import json,re
R=Path(__file__).resolve().parents[1]
def build():
 rows=json.loads((R/'assets/data/articles.json').read_text());header=(R/'templates/header.html').read_text();footer=(R/'templates/footer.html').read_text();template=Template((R/'templates/article.html').read_text());tools={t['slug']:t for t in json.loads((R/'assets/data/tools.json').read_text())}
 for a in rows:
  if a.get('existing'):continue
  links='<div class="guide-tools">'+''.join(f'<a class="button small ghost" href="../tools/{s}.html">{E(tools[s]["title"])}</a>' for s in a['tools'])+'</div>'
  body=links+(R/'content/articles'/f'{a["slug"]}.html').read_text()+links
  if a['sources']:body+='<h2>Further reading</h2><ul>'+''.join(f'<li><a href="{E(url)}" target="_blank" rel="noopener">{E(title)}</a></li>' for title,url in a['sources'])+'</ul>'
  content=template.substitute(title=E(a['title']),summary=E(a['summary']),category=E(a['category'].title())+' · Practical guide',date=a['date'],header=header,footer=footer,body=body).replace('</head>','<link rel="stylesheet" href="../assets/css/engineering.css?v=1"></head>')
  (R/'blog'/f'{a["slug"]}.html').write_text(content)
 p=R/'blog/index.html';s=p.read_text();start=s.index('<div class="filters"');end=s.index('</section>',start)
 cats={'all':'All articles','signal':'Signals & calibration','temperature':'Temperature','process':'Flow & process','electrical':'Electrical','commissioning':'Commissioning','safety':'Safety logic'}
 section='<div class="filters">'+''.join(f'<button type="button" data-filter="{k}" class="filter {"active" if k=="all" else ""}" aria-pressed="{"true" if k=="all" else "false"}">{v}</button>' for k,v in cats.items())+'</div><div class="article-grid">'
 for a in rows:
  words=len((R/'content/articles'/f'{a["slug"]}.html').read_text().split()) if not a.get('existing') else 900
  section+=f'<a class="article-card" data-tool-card data-category="{a["category"]}" href="{a["slug"]}.html"><span class="category-label">{cats[a["category"]]}</span><h3>{E(a["title"])}</h3><p>{E(a["summary"])}</p><span class="read-time">{max(2,round(words/180))} min read · {a["date"]}</span></a>'
 section+='</div><div class="empty-state" data-empty-state>No articles in this category yet.</div></div>'
 s=s[:start]+section+s[end:];p.write_text(s)
if __name__=='__main__':build()
