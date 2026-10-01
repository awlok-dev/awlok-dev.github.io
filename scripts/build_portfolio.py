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
<title>{e(title)}</title><meta name="description" content="{e(description)}"><meta name="author" content="Alex Wong"><meta name="theme-color" content="#101211">
<link rel="canonical" href="https://awlok-dev.github.io/{'' if path == 'index.html' else e(path)}">
<meta property="og:type" content="website"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="https://awlok-dev.github.io/{'' if path == 'index.html' else e(path)}"><meta property="og:image" content="https://awlok-dev.github.io/{e(image)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/images/web_icon.png"><link rel="stylesheet" href="portfolio.css"><script src="portfolio.js" defer></script></head><body id="top">
<a class="skip-link" href="#main">Skip to content</a>'''

def header(home=False):
    prefix = '' if home else 'index.html'
    return f'''<header class="site-header"><div class="wrap header-inner"><a class="brand" href="index.html" aria-label="Alex Wong home"><span class="brand-mark" aria-hidden="true">AW</span><span class="brand-name">Alex Wong<small>Developer & artist</small></span></a>
<button class="menu-toggle" aria-controls="navigation" aria-expanded="false">Menu <span aria-hidden="true">＋</span></button>
<nav class="navigation" id="navigation" aria-label="Main navigation"><a href="{prefix}#work">Selected work</a><a href="{prefix}#work" data-filter-link="vfx">VFX & shaders</a><a href="{prefix}#work" data-filter-link="art">3D art</a><a href="{prefix}#about">About</a><a class="nav-contact" href="{prefix}#contact">Let’s talk <span class="arrow" aria-hidden="true">↗</span></a></nav></div></header>'''

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
home = head('Alex Wong — Game Developer, VFX & 3D Artist', 'Games, real-time visual effects and 3D worlds by Alex Wong. Explore Unity projects, interactive installations, shader studies and Blender artwork.') + header(True) + f'''
<main id="main"><section class="hero" aria-labelledby="hero-title"><img class="hero-art" src="assets/portfolio/hero.webp" alt="A glowing crystal suspended in a cinematic blue environment, artwork by Alex Wong" width="1920" height="1080" fetchpriority="high"><div class="wrap hero-inner">
<p class="eyebrow">Alex Wong / Independent portfolio</p><h1 id="hero-title">Code. Motion.<br><em>Worlds.</em></h1>
<p class="roles">Game developer <span>/</span> VFX artist <span>/</span> 3D artist</p><p class="hero-description">I bring ideas to life through gameplay, real-time effects and carefully crafted 3D worlds.</p>
<div class="hero-actions"><a class="button primary" href="#work">Explore my work <span aria-hidden="true">↘</span></a><a class="button secondary" href="https://www.youtube.com/watch?v=c00zaSCYSf8" {reel_attrs}><span aria-hidden="true">▶</span> Watch reel</a></div>
<span class="hero-bottom mono">Scroll to explore ↓</span><a class="hero-credit mono" href="assets/images/gallery/fantasy_crystal.png" {media_attributes('image','assets/images/gallery/fantasy_crystal.png','Fantasy crystal','3D environment study')}>Featured artwork / 01<strong>Fantasy crystal ↗</strong></a></div></section>
<div class="tools-strip"><div class="wrap tools-inner"><span class="mono">Ideas built with</span><strong>Unity</strong><strong>Unreal Engine</strong><strong>Blender</strong><strong>C#</strong><strong>Shader Graph</strong><strong>VFX</strong></div></div>
<section class="section wrap" id="work" aria-labelledby="work-title"><div class="section-heading"><div><p class="eyebrow">01 / Portfolio</p><h2 id="work-title">Selected work<span style="color:var(--accent)">.</span></h2></div><p>From the first line of code to the final frame.<br>A collection of games, effects and visual experiments.</p></div>
<div class="filter-bar"><div class="filters" role="group" aria-label="Filter portfolio"><button class="filter" data-filter="all" aria-pressed="true">All work</button><button class="filter" data-filter="games" aria-pressed="false">Games</button><button class="filter" data-filter="interactive" aria-pressed="false">Interactive</button><button class="filter" data-filter="vfx" aria-pressed="false">VFX & shaders</button><button class="filter" data-filter="art" aria-pressed="false">3D art</button></div><span class="filter-count mono" aria-live="polite" id="work-count">{len(works)} works</span></div>
<div class="work-grid">{''.join(card(x,i+1) for i,x in enumerate(works))}</div><div class="work-footer"><button class="button" id="load-more" hidden>Show more work <span aria-hidden="true">＋</span></button></div>
<details class="model-list" id="3dmodels"><summary>Explore the models in 3D <span>Orbit, zoom and inspect the details.</span></summary><div class="model-links">{model_links}</div></details></section>
<section class="reel-section wrap" id="reel" aria-labelledby="reel-title"><div class="reel-panel"><div class="reel-copy"><p class="eyebrow">Better in motion</p><h2 id="reel-title">See the work<br>come to life.</h2><p>A closer look at the gameplay, visual effects and interactive experiences behind the stills.</p><a class="button primary" href="https://www.youtube.com/watch?v=c00zaSCYSf8" {reel_attrs}>Watch portfolio reel <span aria-hidden="true">↗</span></a></div><a class="reel-visual" href="https://www.youtube.com/watch?v=c00zaSCYSf8" aria-label="Watch Alex Wong’s portfolio reel" {reel_attrs}><img src="assets/portfolio/vfx_sword_rain_magic.webp" alt="Sword rain visual effect preview" loading="lazy" width="640" height="400"><span class="play-ring" aria-hidden="true">▶</span></a></div></section>
<section class="section about" id="about" aria-labelledby="about-title"><div class="wrap"><div class="about-layout"><div><p class="eyebrow">02 / Behind the work</p><h2 id="about-title">A developer’s mind.<br><em>An artist’s eye.</em></h2><div class="stat-row"><div class="stat"><strong>7+</strong><span>Years of experience</span></div><div class="stat"><strong>03</strong><span>Connected disciplines</span></div></div></div><div class="about-text"><p>I’m Alex Wong, a game developer, VFX artist and 3D artist working at the intersection of code and visual storytelling.</p><p>My work spans Unity gameplay, interactive installations, real-time effects and 3D art. I enjoy the whole process: solving the technical problem, finding the visual language, and making the result feel right.</p><p>I work with Unity, Unreal Engine and Blender to turn ideas into experiences for PC, mobile and immersive environments.</p><a class="text-link" href="https://www.linkedin.com/in/alex-wong-2990a32a6/" target="_blank" rel="noopener noreferrer">More about my experience ↗</a></div></div>
<div class="capabilities"><article class="capability"><span class="mono">01 / Build</span><h3>Game development</h3><p>Gameplay systems, responsive interactions and experiences that connect the physical and digital worlds.</p><div class="skill-tags">Unity · Unreal Engine · C#<br>PC · Mobile · VR · Azure Kinect</div></article><article class="capability"><span class="mono">02 / Animate</span><h3>Real-time VFX</h3><p>Effects with a sense of timing, energy and impact. From combat abilities to shaders and interactive visuals.</p><div class="skill-tags">Particles · Shader Graph · VFX Graph<br>Shaders · Materials · Real-time rendering</div></article><article class="capability"><span class="mono">03 / Create</span><h3>3D art & environments</h3><p>Props, spaces and visual studies, bringing form, material and lighting together into a considered final frame.</p><div class="skill-tags">Blender · 3D modeling · Materials<br>Lighting · Animation · Environment art</div></article></div></div></section>
<section class="contact wrap" id="contact" aria-labelledby="contact-title"><p class="eyebrow">03 / Start a conversation</p><div class="contact-layout"><div><h2 id="contact-title">Have a world<br>in mind? <em>Let’s build it.</em></h2><p>For projects, collaborations, or a conversation about the work.</p></div><a class="button primary" href="mailto:alexwonglok@gmail.com">Get in touch <span aria-hidden="true">↗</span></a></div><div class="contact-links"><a class="email-link" href="mailto:alexwonglok@gmail.com">alexwonglok@gmail.com ↗</a><div class="socials"><a href="https://www.linkedin.com/in/alex-wong-2990a32a6/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a><a href="https://www.instagram.com/awlok.dev" target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href="https://github.com/awlok-dev" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></div></section></main>''' + footer()
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
