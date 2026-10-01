"""Check generated pages, local links, media files and content coverage."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, path):
        super().__init__();self.path=path;self.refs=[];self.ids=set();self.errors=[];self.h1=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='h1':self.h1+=1
        if 'id' in a:
            if a['id'] in self.ids:self.errors.append(f'Duplicate ID: {a["id"]}')
            self.ids.add(a['id'])
        for key in ('href','src','data-src','data-webm'):
            if a.get(key):self.refs.append(a[key])
        if tag=='img' and not a.get('alt'):self.errors.append('Missing image alt text')

files=[ROOT/'index.html',*ROOT.glob('project_page_*.html')]
pages={}
for f in files:
    p=Page(f);p.feed(f.read_text());pages[f]=p
errors=[]
for f,p in pages.items():
    if p.h1!=1:p.errors.append(f'Expected one H1; found {p.h1}')
    for ref in p.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc:continue
        target=(f.parent/unquote(url.path)).resolve() if url.path else f
        if target.is_dir():target=target/'index.html'
        if not target.exists():p.errors.append(f'Missing local resource: {ref}')
        elif target.is_file() and target.stat().st_size == 0:p.errors.append(f'Empty local resource: {ref}')
        if url.fragment and target in pages and url.fragment not in pages[target].ids:p.errors.append(f'Missing fragment: {ref}')
    errors.extend(f'{f.name}: {x}' for x in p.errors)
data=json.loads((ROOT/'portfolio-content.json').read_text())
for x in data['projects']+data['artworks']:
    if f'data-work-id="{x["id"]}"' not in (ROOT/'index.html').read_text():errors.append(f'Missing work: {x["id"]}')
assert not errors, '\n'.join(errors)
print(f'PASS: {len(pages)} pages; local links, assets, anchors, headings, alt text and {len(data["projects"])+len(data["artworks"])} portfolio entries.')
