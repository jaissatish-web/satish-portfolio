"""Check public page links, shared chrome and JavaScript syntax without dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.inline=[];self.script=None;self.base=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='base':self.base=a.get('href');return
  for k in ['href','src']:
   if k in a:self.refs.append(a[k])
  if tag=='script' and not a.get('src') and a.get('type','') not in ['application/ld+json','application/json']:self.script=''
 def handle_data(self,data):
  if self.script is not None:self.script+=data
 def handle_endtag(self,tag):
  if tag=='script' and self.script is not None:self.inline.append(self.script);self.script=None
errors=[];pages=[ROOT/'index.html']+[p for d in ['tools','blog','portfolio','knowledge'] for p in (ROOT/d).rglob('*.html')]
for p in pages:
 s=p.read_text();parser=Page();parser.feed(s)
 for ref in parser.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc or not u.path:continue
  path=unquote(u.path)
  target=ROOT/path.removeprefix('/satish-portfolio/') if path.startswith('/satish-portfolio/') else (ROOT if parser.base=='/satish-portfolio/' else p.parent)/path
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(f'{p.relative_to(ROOT)}: missing {ref}')
 for code in parser.inline:
  with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as f:
   f.write(code);f.flush();r=subprocess.run(['node','--check',f.name],capture_output=True,text=True)
   if r.returncode:errors.append(f'{p.relative_to(ROOT)}: invalid JavaScript {r.stderr}')
for t in json.loads((ROOT/'assets/data/tools.json').read_text()):
 s=(ROOT/'tools'/f"{t['slug']}.html").read_text()
 if t['status']=='planned' and 'Planned tool' not in s:errors.append(t['slug']+': missing planned label')
if errors:raise SystemExit('\n'.join(errors))
print(f'Passed: {len(pages)} pages, local links, inline JavaScript and planned-tool labels.')
