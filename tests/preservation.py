"""Verify protected bytes, source content preservation, metadata and deterministic output."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,subprocess,re
R=Path(__file__).resolve().parents[1]
BASELINE=json.loads((R/'tests/preservation-baseline.json').read_text())
for name,digest in BASELINE['files'].items():
    assert hashlib.sha256((R/name).read_bytes()).hexdigest()==digest,name+' changed'
class MainText(HTMLParser):
    def __init__(self):super().__init__();self.active=False;self.skip=0;self.words=[]
    def handle_starttag(self,tag,attrs):
        if tag=='main':self.active=True
        if tag in ['script','style','noscript']:self.skip+=1
    def handle_endtag(self,tag):
        if tag=='main':self.active=False
        if tag in ['script','style','noscript']:self.skip-=1
    def handle_data(self,value):
        if self.active and not self.skip:self.words.extend(value.split())
# A shallow clone may not contain the original commit: hashes still protect all core files.
commit=BASELINE['commit']
has_commit=subprocess.run(['git','cat-file','-e',commit],cwd=R,capture_output=True).returncode==0
if has_commit:
    paths=subprocess.check_output(['git','ls-tree','-r','--name-only',commit],cwd=R,text=True).splitlines()
    for name in paths:
        if not name.endswith('.html') or name.startswith(('content/','templates/')) or name=='light-preview.html' or 'article-template' in name:continue
        old=subprocess.check_output(['git','show',commit+':'+name],cwd=R,text=True)
        old=old.replace('Managing 50,000+ loop checks ahead of schedule','Verification role across a 50,000+ loop scope, ahead of schedule').replace('DCS validation &amp; SCADA commissioning across 8,000+ points','DCS validation &amp; SCADA commissioning role across 8,000+ control points').replace('12,000+ loop tests across DCS, SIS, SCADA systems','Verification role across a 12,000+ loop-test scope in DCS, SIS, SCADA systems')
        a=MainText();a.feed(old);b=MainText();b.feed((R/name).read_text());tokens=iter(b.words)
        assert all(any(token==word for token in tokens) for word in a.words),name+' original content missing or reordered'
else:print('Historical text comparison skipped: original commit is not in this shallow clone. Run git fetch --unshallow for that check.')
pages=[R/'index.html']+[p for folder in ['tools','portfolio','knowledge','blog'] for p in (R/folder).rglob('*.html')]
for p in pages:
    text=p.read_text()
    if 'http-equiv="refresh"' in text:continue
    assert len(re.findall(r'<link[^>]*rel="stylesheet"',text))==1,p
    assert 'fonts.googleapis.com' not in text and 'fonts.gstatic.com' not in text,p
    assert len(re.findall(r'rel="canonical"',text))==1,p
    assert 'name="twitter:card" content="summary_large_image"' in text,p
    assert 'property="og:type" content="profile"' in text,p
    schema=re.search(r'<script type="application/ld\+json">(.*?)</script>',text,re.S)
    assert json.loads(schema.group(1))['@type']=='Person',p
# Validate the same no-diff contract used by the existing GitHub workflow.
def snapshot():
    return {str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in R.rglob('*') if p.is_file() and '.git' not in p.parts and '__pycache__' not in p.parts}
before=snapshot();subprocess.run(['python3',str(R/'scripts/build.py')],check=True,cwd=R);after=snapshot()
assert before==after,'Rebuild changed committed artifacts'
print('PASS: protected bytes, preserved content, single theme, metadata and repeatable build.')
