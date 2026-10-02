"""Rebuild the static portfolio with Python 3 (no third-party dependencies)."""
import json
from hashlib import sha256
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def asset_url(name):
    return name + '?v=' + sha256((ROOT / name).read_bytes()).hexdigest()[:12]

DATA = json.loads((ROOT / 'portfolio-content.json').read_text())
CATEGORIES = {'games': 'Game development', 'interactive': 'Interactive', 'vfx': 'VFX & shaders', 'art': '3D art'}

def e(s): return escape(str(s), quote=True)

def head(title, description, path='index.html', image='assets/portfolio/hero.webp'):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(description)}"><meta name="author" content="Alex Wong"><meta name="theme-color" content="#070b12">
<link rel="canonical" href="https://awlok-dev.github.io/{'' if path == 'index.html' else e(path)}">
<meta property="og:type" content="website"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="https://awlok-dev.github.io/{'' if path == 'index.html' else e(path)}"><meta property="og:image" content="https://awlok-dev.github.io/{e(image)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/images/web_icon.png"><link rel="stylesheet" href="{asset_url('portfolio.css')}"><script src="{asset_url('portfolio.js')}" defer></script></head><body id="top">
<a class="skip-link" href="#main">Skip to content</a>'''

def header(home=False):
    prefix = '' if home else 'index.html'
    return f'''<header class="site-header"><div class="header-inner wrap"><a class="brand" href="index.html" aria-label="Alex Wong home"><span class="brand-mark">AW<span>/</span></span><span class="brand-name">ALEX WONG<small>GAMES · VFX · 3D</small></span></a><button class="menu-toggle" aria-controls="navigation" aria-expanded="false">MENU ＋</button><nav class="navigation" id="navigation" aria-label="Main navigation"><a href="{prefix}#projects">PROJECTS</a><a href="{prefix}#vfx">VFX</a><a href="{prefix}#art">3D ARTS</a><a class="nav-contact" href="{prefix}#contact">CONTACT ↗</a></nav></div></header>'''

def footer():
    return '''<footer class="site-footer"><div class="wrap footer-inner"><span>© <span id="year">2026</span> Alex Wong · AWLOK</span><span>Code meets craft.</span><a href="#top">Back to top ↑</a></div></footer>
<dialog id="media-dialog" aria-labelledby="dialog-title"><div class="dialog-header"><h2 id="dialog-title">Project preview</h2><button class="dialog-close" autofocus>Close ×</button></div><div class="dialog-media"></div><div class="dialog-footer"><span id="dialog-caption"></span><a id="dialog-source" target="_blank" rel="noopener noreferrer">Open original ↗</a><a id="dialog-model" hidden target="_blank" rel="noopener noreferrer">Explore 3D model ↗</a></div></dialog></body></html>'''

def media_attributes(kind, src, title, caption='', model=''):
    return f'data-media="{e(kind)}" data-src="{e(src)}" data-title="{e(title)}" data-caption="{e(caption)}"' + (f' data-model="{e(model)}"' if model else '')

def card(x, index):
    project = 'url' in x
    kind = 'project' if project else x['kind']
    href = x['url'] if project else x['src']
    attrs = '' if project else media_attributes(kind, href, x['title'], ' · '.join(x['tags']), x.get('model',''))
    if x.get('webm'): attrs += f' data-webm="{e(x["webm"])}"'
    tags = ' / '.join(x['tags'][:3])
    summary = f'<p class="card-summary">{e(x["summary"])}</p>' if project else ''
    return f'''<article class="work-card" data-category="{x['category']}" data-work-id="{e(x['id'])}"><a class="card-link" href="{e(href)}" {attrs}><div class="card-image"><img src="{e(x['thumbnail'])}" alt="{e(x['title'])}" loading="lazy" decoding="async" width="640" height="432"><span class="card-category">{CATEGORIES[x['category']]}</span><span class="card-open" aria-hidden="true">{'▶' if kind=='video' else '↗'}</span></div><div class="card-meta"><h3>{e(x['title'])}</h3><span aria-hidden="true">{index:02d}</span></div><div class="card-tags">{e(tags)}</div>{summary}</a></article>'''

projects = DATA['projects']
artworks = DATA['artworks']
lookup = {x['id']: x for x in projects + artworks}
featured = ['phobos','vfx_tornado_001','fantasy_crystal','samsung','vampire','katana_1']
works = [lookup[k] for k in featured] + [x for x in projects + artworks if x['id'] not in featured]
reel_attrs = media_attributes('embed', 'https://www.youtube-nocookie.com/embed/c00zaSCYSf8', 'Portfolio reel', 'Games, real-time effects and interactive experiences')
model_links = ''.join(f'<a class="button" href="https://sketchfab.com/models/{x["id"]}" {media_attributes("embed", "https://sketchfab.com/models/"+x["id"]+"/embed?ui_theme=dark", x["title"], "Interactive 3D model · Drag to orbit, scroll to zoom")}>{e(x["title"])} ↗</a>' for x in DATA['models'])
# Lead with the three disciplines; each preview is an existing portfolio work.
hero_ids = ['phobos', 'vfx_sword_slash_002', 'fantasy_crystal']
hero_skills = ['Game Development', 'VFX', '3D Arts']
hero_titles = ['GAME<br>DEVELOPMENT', 'REAL-TIME<br>VFX', '3D<br>ARTS']
hero_descriptions = ['Gameplay, systems and worlds made to be explored.', 'Real-time effects with energy, timing and impact.', 'Form, material and light. From a first shape to a finished world.']
hero_panels = []
hero_selectors = []
for i,k in enumerate(hero_ids):
    x=lookup[k]
    src=x.get('url',x.get('src'))
    attrs='' if 'url' in x else media_attributes(x['kind'],x['src'],x['title'],' · '.join(x['tags']))
    if x.get('webm'): attrs += f' data-webm="{e(x["webm"])}"'
    art='assets/portfolio/hero.webp' if k=='fantasy_crystal' else x.get('image', x['thumbnail'])
    video = ''
    if k == 'vfx_sword_slash_002':
        video = f'<video class="hero-video" muted loop playsinline preload="none" poster="{x["thumbnail"]}" aria-hidden="true" tabindex="-1"><source data-src="{x["webm"]}" type="video/webm"><source data-src="{x["src"]}" type="video/mp4"></video><button class="hero-motion" type="button" aria-label="Play VFX preview" aria-pressed="false" hidden>PLAY PREVIEW ▶</button>'
    hero_panels.append(f'''<article class="hero-slide" id="hero-{i}" {'hidden' if i else ''} aria-label="{e(hero_skills[i])}"><img class="hero-art" src="{art}" alt="{e(x['title'])}" {'fetchpriority="high"' if i==0 else 'loading="lazy"'} width="1920" height="1080">{video}<div class="hero-shade"></div><div class="hero-copy wrap"><p class="eyebrow">ALEX WONG / {i+1:02d} — {hero_skills[i].upper()}</p><h2>{hero_titles[i]}</h2><p class="hero-work-label">FEATURED WORK <span>/</span> {e(x['title'])}</p><p class="hero-description">{hero_descriptions[i]}</p><a class="button primary" href="{e(src)}" {attrs}>{'VIEW PROJECT' if 'url' in x else 'WATCH SWORD SLASH 02' if x['kind']=='video' else 'EXPLORE ARTWORK'} <span>↗</span></a></div></article>''')
    hero_selectors.append(f'<a class="hero-selector" href="#hero-{i}" data-hero="{i}" aria-controls="hero-{i}" aria-current="{str(i==0).lower()}"><span class="selector-number">0{i+1}</span><img src="{x["thumbnail"]}" alt="{e(x["title"])}" width="160" height="90"><span class="selector-label"><strong>{e(hero_skills[i])}</strong><small>{e(x["title"])}</small></span></a>')
def collection_controls(key, label, count):
    return f'<div class="collection-controls"><span class="collection-count mono" data-collection-count aria-live="polite">01 / {count:02d}</span><button class="collection-arrow" data-step="-1" aria-label="Previous {label}" aria-controls="{key}-panels">←</button><button class="collection-arrow" data-step="1" aria-label="Next {label}" aria-controls="{key}-panels">→</button></div>'

def collection_markup(items, key):
    panels=[]; selectors=[]
    for i,x in enumerate(items):
        is_project = 'url' in x
        ident=f'{key}-item-{x["id"]}'
        attrs=f'class="collection-panel {"project-feature" if is_project else "art-feature"}" id="{ident}" data-work-id="{x["id"]}" data-category="{x["category"]}"' + (' hidden' if i else '')
        if is_project:
            panels.append(f'''<article {attrs}><a class="feature-image" href="{x['url']}"><img src="{x['image']}" alt="{e(x['title'])}" loading="lazy" width="1200" height="675"><span class="feature-view">EXPLORE PROJECT ↗</span></a><div class="feature-copy"><p class="eyebrow">{'GAME' if x['category']=='games' else 'INTERACTIVE'} / {e(x['platform'])}</p><h3>{e(x['title'])}</h3><p>{e(x['summary'])}</p><div class="feature-tags">{' · '.join(e(t) for t in x['tags'][:4])}</div><a class="button dark-button" href="{x['url']}">VIEW PROJECT <span>↗</span></a></div></article>''')
        else:
            media_attrs=media_attributes(x['kind'],x['src'],x['title'],' · '.join(x['tags']),x.get('model',''))
            if x.get('webm'):media_attrs+=f' data-webm="{x["webm"]}"'
            if x['kind']=='video':
                sources=(f'<source data-src="{x["webm"]}" type="video/webm">' if x.get('webm') else '') + f'<source data-src="{x["src"]}" type="video/mp4">'
                media=f'<div class="collection-screen"><video data-inline-video controls loop playsinline preload="none" poster="{x["thumbnail"]}" aria-label="{e(x["title"])}">{sources}</video><button class="collection-play" aria-label="Play {e(x["title"])}"><span>▶</span><small>PLAY PREVIEW</small></button></div>'
            else:
                media=f'<a class="collection-screen" href="{x["src"]}" {media_attrs}><img src="{x["src"]}" alt="{e(x["title"])}" loading="lazy"><span class="feature-view">VIEW FULL SIZE ↗</span></a>'
            panels.append(f'<article {attrs}>{media}<div class="collection-caption"><div><p class="eyebrow">{"VFX & SHADERS" if key=="vfx" else "3D ARTS"}</p><h3>{e(x["title"])}</h3></div><a class="text-link" href="{x["src"]}" {media_attrs}>{"OPEN PLAYER" if x["kind"]=="video" else "VIEW ARTWORK"} ↗</a></div></article>')
        selectors.append(f'<a class="collection-thumb" href="#{ident}" data-select="{ident}" data-category="{x["category"]}" aria-controls="{ident}" aria-current="{str(i==0).lower()}"><img src="{x["thumbnail"]}" alt="{e(x["title"])}" width="240" height="135" loading="lazy"><span><b>{i+1:02d}</b> {e(x["title"])}</span></a>')
    return f'<div class="collection-panels" id="{key}-panels">'+''.join(panels)+f'</div><div class="collection-thumbnails" aria-label="Choose from all {key} works">'+''.join(selectors)+'</div>'

vfx_works=[lookup['vfx_sword_slash_002']]+[x for x in artworks if x['category']=='vfx' and x['id']!='vfx_sword_slash_002']
art_works=[lookup['fantasy_crystal']]+[x for x in artworks if x['category']=='art' and x['id']!='fantasy_crystal']
home = head('Alex Wong — Game Developer, VFX & 3D Artist', 'Explore games, real-time visual effects and 3D worlds by Alex Wong. Unity development, interactive experiences and Blender artwork.') + header(True) + f'''
<main id="main"><h1 class="sr-only">Alex Wong — Game Developer, VFX Artist & 3D Artist</h1>
<section class="hero" aria-label="Three creative disciplines">{''.join(hero_panels)}<div class="hero-topline wrap"><span>THE PORTFOLIO OF ALEX WONG</span><span>GAME DEVELOPMENT / VFX / 3D ART</span></div><a class="hero-reel" href="https://www.youtube.com/watch?v=c00zaSCYSf8" {reel_attrs}><span>▶</span> WATCH REEL</a><div class="hero-bottom wrap"><a class="scroll-cue" href="#projects"><span>SCROLL TO EXPLORE</span> ↓</a><div class="hero-selectors" aria-label="Explore my three skills">{''.join(hero_selectors)}</div></div><span class="hero-side" aria-hidden="true">IMAGINE. BUILD. PLAY.</span></section>
<div class="discipline-strip"><span>GAME DEVELOPMENT</span><b>✦</b><span>REAL-TIME VFX</span><b>✦</b><span>3D ART & ENVIRONMENTS</span><b>✦</b></div>
<section class="showcase light-section collection" id="projects" data-collection="projects" aria-labelledby="projects-title"><span id="work"></span><div class="section-heading wrap"><div><p class="eyebrow">01 / PLAYABLE WORLDS & EXPERIENCES</p><h2 id="projects-title">PROJECTS<span class="heading-dot">.</span></h2></div>{collection_controls('projects','project',len(projects))}</div><div class="wrap"><div class="project-filters" role="group" aria-label="Project type"><button data-project-filter="all" aria-pressed="true">ALL PROJECTS <span>{len(projects)}</span></button><button data-project-filter="games" aria-pressed="false">GAME <span>{sum(x['category']=='games' for x in projects)}</span></button><button data-project-filter="interactive" aria-pressed="false">INTERACTIVE <span>{sum(x['category']=='interactive' for x in projects)}</span></button></div>{collection_markup(projects,'projects')}</div></section>
<section class="vfx-section collection" id="vfx" data-collection="vfx" aria-labelledby="vfx-title"><div class="section-heading wrap"><div><p class="eyebrow">02 / ENERGY. TIMING. IMPACT.</p><h2 id="vfx-title">VFX<span class="heading-dot">.</span></h2></div>{collection_controls('vfx','VFX work',len(vfx_works))}</div><div class="wrap">{collection_markup(vfx_works,'vfx')}</div></section>
<section class="art-section light-section collection" id="art" data-collection="art" aria-labelledby="art-title"><div class="section-heading wrap"><div><p class="eyebrow">03 / FORM. MATERIAL. ATMOSPHERE.</p><h2 id="art-title">3D ARTS<span class="heading-dot">.</span></h2></div>{collection_controls('art','3D artwork',len(art_works))}</div><div class="wrap">{collection_markup(art_works,'art')}</div><details class="model-list wrap" id="3dmodels"><summary>EXPLORE INTERACTIVE 3D MODELS <span>Orbit, zoom and inspect.</span></summary><div class="model-links">{model_links}</div></details></section>
<noscript><style>.collection-panel[hidden]{{display:grid!important}}.collection-panel{{margin-block:25px}}.collection-controls,.project-filters,.collection-play{{display:none!important}}</style></noscript>
<section class="contact" id="contact" aria-labelledby="contact-title"><div class="wrap contact-inner"><div id="about"><p class="eyebrow">THE PERSON BEHIND THE PIXELS</p><h2 id="contact-title">ALEX WONG<span class="heading-dot">.</span></h2><p>Game developer. VFX artist. 3D artist.<br>7+ years turning ideas into games, interactive experiences and visual worlds with Unity, Unreal Engine and Blender.</p></div><div class="contact-action"><p class="mono">LET’S MAKE SOMETHING WORTH PLAYING.</p><a class="button primary" href="mailto:alexwonglok@gmail.com">GET IN TOUCH <span>↗</span></a><a class="email-link" href="mailto:alexwonglok@gmail.com">alexwonglok@gmail.com</a></div></div><div class="contact-links wrap"><span class="mono">CODE / MOTION / WORLDS</span><div class="socials"><a href="https://www.linkedin.com/in/alex-wong-2990a32a6/" target="_blank" rel="noopener noreferrer">LINKEDIN ↗</a><a href="https://www.instagram.com/awlok.dev" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a><a href="https://github.com/awlok-dev" target="_blank" rel="noopener noreferrer">GITHUB ↗</a></div></div></section></main>''' + footer()
(ROOT/'index.html').write_text(home)

for i,p in enumerate(projects):
    tags = ''.join(f'<span>{e(t)}</span>' for t in p['tags'])
    gallery = []
    for j,m in enumerate(p['media']):
        embed = m['type']=='embed'
        src = m['src'].replace('www.youtube.com/embed/','www.youtube-nocookie.com/embed/')
        title = f'{p["title"]} — {"video / demo" if embed else "image"} {j+1}'
        # Every preview remains a working ordinary link without JavaScript.
        fallback = ('https://www.youtube.com/watch?v=' + src.split('/embed/')[1].split('?')[0]) if embed and 'youtube' in src else src
        preview = p['thumbnail'] if embed else src
        overlay = '<span class="media-overlay"><span class="play-ring" aria-hidden="true">▶</span></span>' if embed else '<span class="card-open" aria-hidden="true">↗</span>'
        gallery.append(f'<a href="{e(fallback)}" {media_attributes(m["type"],src,title,p["platform"])}><img src="{e(preview)}" alt="{e(title)}" loading="lazy" decoding="async" width="800" height="500">{overlay}<span class="media-caption">{"Play video / demo" if embed else "View image"} / {j+1:02d}</span></a>')
    links=''.join(f'<a class="button" href="{e(l["url"])}" target="_blank" rel="noopener noreferrer">{e(l["label"])} ↗</a>' for l in p['links'])
    nxt=projects[(i+1)%len(projects)]
    page=head(p['title']+' — Alex Wong',p['summary'],p['url'],p['thumbnail'])+header()+f'''<main id="main" class="wrap"><div class="page-top"><a class="back-link" href="index.html#projects">← Back to projects</a><div class="project-heading"><div><p class="eyebrow">{CATEGORIES[p['category']]} / {e(p['platform'])}</p><h1>{e(p['title'])}</h1></div><p>{e(p['summary'])}</p></div><div class="project-tags">{tags}</div></div><img class="project-cover" src="{e(p['thumbnail'])}" alt="{e(p['title'])}" width="1280" height="720" fetchpriority="high"><section class="project-story" aria-labelledby="overview-title"><h2 id="overview-title">Project overview</h2><div><p>{e(p['description'])}</p>{links}</div></section>'''
    if gallery:page+=f'<section aria-labelledby="gallery-title"><div class="section-heading"><div><p class="eyebrow">A closer look</p><h2 id="gallery-title">Project gallery.</h2></div><p>Explore screenshots, footage and project details.</p></div><div class="project-gallery">{"".join(gallery)}</div></section>'
    page+=f'<div class="project-navigation"><a class="back-link" href="index.html#projects">← All projects</a><a class="next" href="{e(nxt["url"])}"><small class="mono">Next project ↗</small><strong>{e(nxt["title"])}</strong></a></div></main>'+footer()
    (ROOT/p['url']).write_text(page)
# Keep the old test alias working, with the same updated design.
(ROOT/'project_page_test.html').write_text((ROOT/'project_page_goblin.html').read_text())
print(f'Built homepage and {len(projects)} project pages.')
