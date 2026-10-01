"""Rebuild the static portfolio with Python 3 (no third-party dependencies)."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'portfolio-content.json').read_text())
CATEGORIES = {'games': 'Game development', 'interactive': 'Interactive', 'vfx': 'VFX & shaders', 'art': '3D art'}

def e(s): return escape(str(s), quote=True)

def head(title, description, path='index.html', image='assets/portfolio/hero.webp'):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(description)}"><meta name="author" content="Alex Wong"><meta name="theme-color" content="#070b12">
<link rel="canonical" href="https://awlok-dev.github.io/{'' if path == 'index.html' else e(path)}">
<meta property="og:type" content="website"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="https://awlok-dev.github.io/{'' if path == 'index.html' else e(path)}"><meta property="og:image" content="https://awlok-dev.github.io/{e(image)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/images/web_icon.png"><link rel="stylesheet" href="portfolio.css"><script src="portfolio.js" defer></script></head><body id="top">
<a class="skip-link" href="#main">Skip to content</a>'''

def header(home=False):
    prefix = '' if home else 'index.html'
    return f'''<header class="site-header"><div class="header-inner wrap"><a class="brand" href="index.html" aria-label="Alex Wong home"><span class="brand-mark">AW<span>/</span></span><span class="brand-name">ALEX WONG<small>GAMES · VFX · 3D</small></span></a><button class="menu-toggle" aria-controls="navigation" aria-expanded="false">MENU ＋</button><nav class="navigation" id="navigation" aria-label="Main navigation"><a href="{prefix}#projects">PROJECTS</a><a href="{prefix}#vfx">VISUAL EFFECTS</a><a href="{prefix}#art">3D ART</a><a href="{prefix}#work">ALL WORK</a><a class="nav-contact" href="{prefix}#contact">CONTACT ↗</a></nav></div></header>'''

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
# Work is the opening statement. All selectors are real links without JavaScript.
hero_ids = ['fantasy_crystal', 'phobos', 'scifi_street_animation']
hero_titles = ['FANTASY<br>CRYSTAL', 'PHOBOS<br>ODDITY', 'SCI-FI<br>STREET']
hero_descriptions = ['Light, atmosphere and an otherworldly space.', 'Psychological horror in the hidden corners of Hong Kong.', 'A small world, brought to life in motion.']
hero_panels = []
hero_selectors = []
for i,k in enumerate(hero_ids):
    x=lookup[k]
    src=x.get('url',x.get('src'))
    attrs='' if 'url' in x else media_attributes(x['kind'],x['src'],x['title'],' · '.join(x['tags']))
    art='assets/portfolio/hero.webp' if i==0 else x['thumbnail']
    hero_panels.append(f'''<article class="hero-slide" id="hero-{i}" {'hidden' if i else ''} aria-label="{e(x['title'])}"><img class="hero-art" src="{art}" alt="{e(x['title'])}" {'fetchpriority="high"' if i==0 else 'loading="lazy"'} width="1920" height="1080"><div class="hero-shade"></div><div class="hero-copy wrap"><p class="eyebrow">SELECTED WORK / {i+1:02d} — {CATEGORIES[x['category']]}</p><h2>{hero_titles[i]}</h2><p class="hero-description">{hero_descriptions[i]}</p><a class="button primary" href="{e(src)}" {attrs}>{'VIEW PROJECT' if 'url' in x else 'PLAY FILM' if x['kind']=='video' else 'EXPLORE ARTWORK'} <span>↗</span></a></div></article>''')
    hero_selectors.append(f'<a class="hero-selector" href="#hero-{i}" data-hero="{i}" aria-controls="hero-{i}" aria-current="{str(i==0).lower()}"><span class="selector-number">0{i+1}</span><img src="{x["thumbnail"]}" alt="{e(x["title"])}" width="160" height="90"><span>{e(x["title"])}</span></a>')
showcase_ids=['phobos','vampire','samsung','cityplaza_chirstmas']
showcases=[]; project_selectors=[]
for i,k in enumerate(showcase_ids):
    x=lookup[k]
    showcases.append(f'''<article class="project-feature" id="feature-{k}" {'hidden' if i else ''}><a class="feature-image" href="{x['url']}"><img src="{x['image']}" alt="{e(x['title'])}" loading="lazy" width="1200" height="675"><span class="feature-view">EXPLORE PROJECT ↗</span></a><div class="feature-copy"><span class="feature-index">0{i+1}<small> / 04</small></span><p class="eyebrow">{CATEGORIES[x['category']]} / {e(x['platform'])}</p><h3>{e(x['title'])}</h3><p>{e(x['summary'])}</p><div class="feature-tags">{' · '.join(e(t) for t in x['tags'][:4])}</div><a class="button dark-button" href="{x['url']}">VIEW PROJECT <span>↗</span></a></div></article>''')
    project_selectors.append(f'<a class="project-selector" href="#feature-{k}" data-project="{k}" aria-controls="feature-{k}" aria-current="{str(i==0).lower()}"><img src="{x["thumbnail"]}" alt="{e(x["title"])}" width="240" height="135" loading="lazy"><span><b>0{i+1}</b> {e(x["title"])}</span></a>')
vfx_ids=['vfx_tornado_001','vfx_ice_skill_001','vfx_sword_rain_magic','vfx_dark_hole_001','vfx_sword_slash_002','spawn_cube']
vfx_selectors=[]
for i,k in enumerate(vfx_ids):
    x=lookup[k]
    vfx_selectors.append(f'<a class="vfx-selector" href="{x["src"]}" data-clip="{x["src"]}" data-poster="{x["thumbnail"]}" data-title="{e(x["title"])}" data-webm="{x.get("webm", "")}" aria-current="{str(i==0).lower()}"><img src="{x["thumbnail"]}" alt="{e(x["title"])}" width="240" height="135" loading="lazy"><span><b>0{i+1}</b> {e(x["title"])} <i>▶</i></span></a>')
art_panels=[]
for i,k in enumerate(['katana_1','cyberpunk-scene-1x1','hallyway']):
    x=lookup[k]
    art_panels.append(f'<a class="art-piece art-piece-{i}" href="{x["src"]}" {media_attributes("image",x["src"],x["title"],"3D art · Blender",x.get("model",""))}><img src="{x["src"]}" alt="{e(x["title"])}" loading="lazy"><span class="art-label"><small>0{i+1} / 3D STUDY</small><strong>{e(x["title"])} <i>↗</i></strong></span></a>')
home = head('Alex Wong — Game Developer, VFX & 3D Artist', 'Explore games, real-time visual effects and 3D worlds by Alex Wong. Unity development, interactive experiences and Blender artwork.') + header(True) + f'''
<main id="main"><h1 class="sr-only">Alex Wong — Game Developer, VFX Artist & 3D Artist</h1>
<section class="hero" aria-label="Featured work">{''.join(hero_panels)}<div class="hero-topline wrap"><span>THE PORTFOLIO OF ALEX WONG</span><span>GAME DEVELOPMENT / VFX / 3D ART</span></div><a class="hero-reel" href="https://www.youtube.com/watch?v=c00zaSCYSf8" {reel_attrs}><span>▶</span> WATCH REEL</a><div class="hero-bottom wrap"><a class="scroll-cue" href="#projects"><span>SCROLL TO EXPLORE</span> ↓</a><div class="hero-selectors" aria-label="Choose featured work">{''.join(hero_selectors)}</div></div><span class="hero-side" aria-hidden="true">IMAGINE. BUILD. PLAY.</span></section>
<div class="discipline-strip"><span>GAME DEVELOPMENT</span><b>✦</b><span>REAL-TIME VFX</span><b>✦</b><span>3D ART & ENVIRONMENTS</span><b>✦</b></div>
<section class="showcase light-section" id="projects" aria-labelledby="projects-title"><div class="section-heading wrap"><div><p class="eyebrow">01 / PLAYABLE WORLDS & EXPERIENCES</p><h2 id="projects-title">PROJECTS<span class="heading-dot">.</span></h2></div><a class="text-link" href="#work">VIEW ALL PROJECTS ↗</a></div><div class="wrap">{''.join(showcases)}<div class="project-selectors" aria-label="Choose a project">{''.join(project_selectors)}</div></div></section>
<section class="vfx-section" id="vfx" aria-labelledby="vfx-title"><div class="section-heading wrap"><div><p class="eyebrow">02 / ENERGY. TIMING. IMPACT.</p><h2 id="vfx-title">VISUAL EFFECTS<span class="heading-dot">.</span></h2></div><p>Real-time experiments.<br>Best experienced in motion.</p></div><div class="vfx-stage wrap"><div class="vfx-screen"><video id="vfx-player" controls loop playsinline preload="none" poster="{lookup['vfx_tornado_001']['thumbnail']}" aria-label="Tornado visual effect"><source src="{lookup['vfx_tornado_001']['src']}" type="video/mp4"></video><button class="vfx-play" aria-label="Play Tornado visual effect"><span>▶</span><small>PLAY EFFECT</small></button><span class="screen-corner" aria-hidden="true">REAL-TIME / VFX LAB</span></div><div class="vfx-caption"><span class="eyebrow" id="vfx-current">Tornado</span><span class="mono">SELECT AN EFFECT BELOW ↓</span></div><div class="vfx-playlist" aria-label="Choose a visual effect">{''.join(vfx_selectors)}</div></div></section>
<section class="art-section light-section" id="art" aria-labelledby="art-title"><div class="section-heading wrap"><div><p class="eyebrow">03 / FORM. MATERIAL. ATMOSPHERE.</p><h2 id="art-title">3D ART<span class="heading-dot">.</span></h2></div><a class="text-link" href="#work" data-filter-link="art">EXPLORE THE GALLERY ↗</a></div><div class="art-grid wrap">{''.join(art_panels)}</div><details class="model-list wrap" id="3dmodels"><summary>EXPLORE INTERACTIVE 3D MODELS <span>Orbit, zoom and inspect.</span></summary><div class="model-links">{model_links}</div></details></section>
<section class="archive wrap" id="work" aria-labelledby="work-title"><div class="section-heading"><div><p class="eyebrow">04 / THE COMPLETE COLLECTION</p><h2 id="work-title">WORK ARCHIVE<span class="heading-dot">.</span></h2></div><span class="archive-total">{len(works)}<small>WORKS & STUDIES</small></span></div><div class="filter-bar"><div class="filters" role="group" aria-label="Filter portfolio"><button class="filter" data-filter="all" aria-pressed="true">ALL WORK</button><button class="filter" data-filter="games" aria-pressed="false">GAMES</button><button class="filter" data-filter="interactive" aria-pressed="false">INTERACTIVE</button><button class="filter" data-filter="vfx" aria-pressed="false">VFX & SHADERS</button><button class="filter" data-filter="art" aria-pressed="false">3D ART</button></div><span class="filter-count mono" aria-live="polite" id="work-count">{len(works)} works</span></div><div class="work-grid">{''.join(card(x,i+1) for i,x in enumerate(works))}</div><div class="work-footer"><button class="button" id="load-more" hidden>LOAD MORE WORK <span>＋</span></button></div></section>
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
    page=head(p['title']+' — Alex Wong',p['summary'],p['url'],p['thumbnail'])+header()+f'''<main id="main" class="wrap"><div class="page-top"><a class="back-link" href="index.html#work">← Back to selected work</a><div class="project-heading"><div><p class="eyebrow">{CATEGORIES[p['category']]} / {e(p['platform'])}</p><h1>{e(p['title'])}</h1></div><p>{e(p['summary'])}</p></div><div class="project-tags">{tags}</div></div><img class="project-cover" src="{e(p['thumbnail'])}" alt="{e(p['title'])}" width="1280" height="720" fetchpriority="high"><section class="project-story" aria-labelledby="overview-title"><h2 id="overview-title">Project overview</h2><div><p>{e(p['description'])}</p>{links}</div></section>'''
    if gallery:page+=f'<section aria-labelledby="gallery-title"><div class="section-heading"><div><p class="eyebrow">A closer look</p><h2 id="gallery-title">Project gallery.</h2></div><p>Explore screenshots, footage and project details.</p></div><div class="project-gallery">{"".join(gallery)}</div></section>'
    page+=f'<div class="project-navigation"><a class="back-link" href="index.html#work">← All work</a><a class="next" href="{e(nxt["url"])}"><small class="mono">Next project ↗</small><strong>{e(nxt["title"])}</strong></a></div></main>'+footer()
    (ROOT/p['url']).write_text(page)
# Keep the old test alias working, with the same updated design.
(ROOT/'project_page_test.html').write_text((ROOT/'project_page_goblin.html').read_text())
print(f'Built homepage and {len(projects)} project pages.')
