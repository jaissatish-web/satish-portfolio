"""Create a local draft using the same site components. Publish only after review."""
from pathlib import Path
from string import Template
from datetime import date
from html import escape
import argparse,re
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('slug');p.add_argument('--title',required=True);p.add_argument('--summary',required=True);p.add_argument('--category',default='Engineering');a=p.parse_args()
if not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*',a.slug):p.error('Use a lowercase hyphenated slug')
folder=root/'_drafts';folder.mkdir(exist_ok=True);dest=folder/(a.slug+'.html')
if dest.exists():p.error('Draft already exists')
content=Template((root/'templates/article.html').read_text()).substitute(title=escape(a.title),summary=escape(a.summary),category=escape(a.category),date=date.today().isoformat(),header=(root/'templates/header.html').read_text(),footer=(root/'templates/footer.html').read_text(),body='<h2>Start here</h2><p>Replace this draft with reviewed content, examples and sources.</p>')
dest.write_text(content);print(dest.relative_to(root))
