'use strict';

(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.navigation');
  function closeMenu() {
    nav?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  nav?.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.classList.contains('open')) {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const heroVideo = document.querySelector('.hero-video');
  const motionButton = document.querySelector('.hero-motion');
  const hero = document.querySelector('.hero');
  let heroInView = true;
  let previewPaused = false;
  function syncHeroVideo(explicit = false) {
    if (!heroVideo) return;
    const active = !heroVideo.closest('.hero-slide').hidden;
    if (!active || !heroInView || document.hidden || document.body.classList.contains('modal-open') || previewPaused || (!explicit && (reducedMotion.matches || navigator.connection?.saveData))) {
      heroVideo.pause();
      return;
    }
    if (!heroVideo.dataset.loaded) {
      heroVideo.querySelectorAll('source').forEach(source => { source.src = source.dataset.src; });
      heroVideo.dataset.loaded = 'true';
      heroVideo.load();
    }
    heroVideo.play().catch(() => { /* The poster and play button remain available. */ });
  }
  if (heroVideo && motionButton) {
    motionButton.hidden = false;
    const updateMotionButton = () => {
      const playing = !heroVideo.paused;
      motionButton.textContent = playing ? 'PAUSE PREVIEW Ⅱ' : 'PLAY PREVIEW ▶';
      motionButton.setAttribute('aria-label', playing ? 'Pause VFX preview' : 'Play VFX preview');
      motionButton.setAttribute('aria-pressed', String(playing));
    };
    heroVideo.addEventListener('play', updateMotionButton);
    heroVideo.addEventListener('pause', updateMotionButton);
    motionButton.addEventListener('click', () => {
      previewPaused = !heroVideo.paused;
      syncHeroVideo(true);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        heroInView = entries[0].isIntersecting;
        syncHeroVideo();
      }, { threshold: 0.15 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => syncHeroVideo());
    reducedMotion.addEventListener('change', () => syncHeroVideo());
  }

  // Each skill and project can also be selected with the arrow, Home and End keys.
  function setupSelector(control, panel) {
    const controls = [...document.querySelectorAll(control)];
    const panels = [...document.querySelectorAll(panel)];
    controls.forEach((link, index) => {
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        controls.forEach(item => item.setAttribute('aria-current', String(item === link)));
        panels.forEach(item => { item.hidden = item.id !== link.getAttribute('aria-controls'); });
        if (link.hasAttribute('data-hero')) syncHeroVideo();
      });
      link.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % controls.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + controls.length) % controls.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = controls.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        controls[next].click();
        controls[next].focus({ preventScroll: true });
      });
    });
    const initial = controls.find(item => item.getAttribute('href') === location.hash);
    if (initial) initial.click();
  }
  setupSelector('[data-hero]', '.hero-slide');
  // A single circular browser per discipline, including every work in that category.
  document.querySelectorAll('[data-collection]').forEach(collection => {
    const panels = [...collection.querySelectorAll('.collection-panel')];
    const thumbs = [...collection.querySelectorAll('[data-select]')];
    const strip = collection.querySelector('.collection-thumbnails');
    const count = collection.querySelector('[data-collection-count]');
    let category = 'all';
    let current = 0;
    const matching = () => panels.filter(panel => category === 'all' || panel.dataset.category === category);
    const pauseVideos = () => collection.querySelectorAll('video').forEach(video => video.pause());
    function playVideo(video) {
      if (!video.dataset.loaded) {
        video.querySelectorAll('source').forEach(source => { source.src = source.dataset.src; });
        video.dataset.loaded = 'true';
        video.load();
      }
      const button = video.parentElement.querySelector('.collection-play');
      button.hidden = true;
      video.play().catch(() => { button.hidden = false; });
    }
    function select(index, interact = false) {
      const items = matching();
      if (!items.length) return;
      current = (index % items.length + items.length) % items.length;
      pauseVideos();
      const active = items[current];
      panels.forEach(panel => { panel.hidden = panel !== active; });
      thumbs.forEach(thumb => {
        thumb.hidden = category !== 'all' && thumb.dataset.category !== category;
        thumb.setAttribute('aria-current', String(thumb.dataset.select === active.id));
      });
      count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      const selectedThumb = thumbs.find(thumb => thumb.dataset.select === active.id);
      if (interact && strip.scrollTo) {
        const box = selectedThumb.getBoundingClientRect();
        const frame = strip.getBoundingClientRect();
        strip.scrollTo({ left: strip.scrollLeft + box.left - frame.left - (frame.width - box.width) / 2, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
      const video = active.querySelector('video');
      if (video && interact) playVideo(video);
    }
    thumbs.forEach(thumb => thumb.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      select(matching().findIndex(panel => panel.id === thumb.dataset.select), true);
    }));
    collection.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => select(current + Number(button.dataset.step), true)));
    collection.querySelectorAll('[data-project-filter]').forEach(button => button.addEventListener('click', () => {
      category = button.dataset.projectFilter;
      collection.querySelectorAll('[data-project-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      select(0, true);
    }));
    strip.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = current + 1;
      if (event.key === 'ArrowLeft') next = current - 1;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = matching().length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(next, true);
      thumbs.find(thumb => thumb.getAttribute('aria-current') === 'true').focus({ preventScroll: true });
    });
    collection.querySelectorAll('.collection-play').forEach(button => button.addEventListener('click', () => playVideo(button.parentElement.querySelector('video'))));
    collection.querySelectorAll('video').forEach(video => video.addEventListener('play', () => { video.parentElement.querySelector('.collection-play').hidden = true; }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pauseVideos(); }, { threshold: 0 }).observe(collection);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseVideos(); });
    const requested = panels.findIndex(panel => '#' + panel.id === location.hash);
    select(requested >= 0 ? requested : 0);
  });

  // Titles animate only once their heading is well inside the viewport, then reset
  // after leaving it completely, so scrolling back replays the full sequence.
  if ('IntersectionObserver' in window) {
    const headings = [...document.querySelectorAll('.section-heading, .contact #about, .project-heading')];
    headings.forEach(heading => {
      const title = heading.querySelector('h2, h1');
      if (!title) return;
      const label = title.textContent.trim();
      title.setAttribute('aria-label', label);
      title.replaceChildren();
      let index = 0;
      label.split(/\s+/).forEach((word, wordIndex) => {
        if (wordIndex) title.append(' ');
        const group = document.createElement('span');
        group.className = 'title-word';
        group.setAttribute('aria-hidden', 'true');
        [...word].forEach(char => {
          const letter = document.createElement('span');
          letter.className = 'title-letter' + (char === '.' ? ' heading-dot' : '');
          letter.style.setProperty('--letter-index', index++);
          letter.textContent = char;
          group.append(letter);
        });
        title.append(group);
      });
      heading.classList.add('animated-heading');
    });
    // One observer owns both states, avoiding competing enter/reset callbacks.
    const replayHeading = heading => {
      heading.classList.remove('heading-active');
      void heading.offsetWidth;
      heading.classList.add('heading-active');
    };
    const titleObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) replayHeading(entry.target);
        else entry.target.classList.remove('heading-active');
      });
    }, { threshold: 0.15, rootMargin: '-70px 0px -15% 0px' });
    headings.forEach(heading => titleObserver.observe(heading));
    // Navigation can scroll past the trigger before arriving. Replay after it settles.
    let destinationHeading = null;
    let replayTimer;
    const replayAfterScroll = () => {
      clearTimeout(replayTimer);
      replayTimer = setTimeout(() => {
        if (destinationHeading) replayHeading(destinationHeading);
        destinationHeading = null;
      }, 180);
    };
    document.querySelectorAll('.navigation a, .scroll-cue').forEach(link => {
      link.addEventListener('click', () => {
        const hash = new URL(link.href, location.href).hash;
        const section = hash && document.getElementById(hash.slice(1));
        destinationHeading = section?.querySelector('.animated-heading');
        if (destinationHeading) replayAfterScroll();
      });
    });
    window.addEventListener('scroll', () => {
      if (destinationHeading) replayAfterScroll();
    }, { passive: true });
    const targets = document.querySelectorAll('.collection-thumbnails, .model-list, .contact-inner, .project-heading, .project-cover, .project-story, .project-gallery > a');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
        else entry.target.classList.remove('is-visible');
      });
    }, { threshold: 0.08 });
    targets.forEach(target => {
      if (reducedMotion.matches) return;
      target.classList.add('scroll-reveal');
      revealObserver.observe(target);
    });
    document.addEventListener('focusin', event => event.target.closest('.scroll-reveal')?.classList.add('is-visible'));
    reducedMotion.addEventListener('change', () => {
      if (!reducedMotion.matches) return;
      targets.forEach(target => target.classList.add('is-visible'));
      revealObserver.disconnect();
    });
  }
  const aliases = { '#gallery': '#art', '#home': '#top', '#work': '#projects' };
  const oldFilter = new URL(location.href).searchParams.get('filter');
  const destination = oldFilter === 'vfx' ? '#vfx' : oldFilter === 'art' ? '#art' : aliases[location.hash];
  if (destination) document.querySelector(destination)?.scrollIntoView();
  if (['games', 'interactive'].includes(oldFilter)) document.querySelector(`[data-project-filter="${oldFilter}"]`)?.click();

  const dialog = document.querySelector('#media-dialog');
  const container = dialog?.querySelector('.dialog-media');
  let trigger = null;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-media]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !dialog?.showModal) return;
    event.preventDefault();
    document.querySelectorAll('[data-inline-video]').forEach(video => video.pause());
    heroVideo?.pause();
    trigger = link;
    const { media, src, title, caption, model, webm } = link.dataset;
    document.querySelector('#dialog-title').textContent = title;
    document.querySelector('#dialog-caption').textContent = caption || '';
    const source = document.querySelector('#dialog-source');
    source.href = link.getAttribute('href');
    source.textContent = media === 'embed' ? 'Open in a new tab ↗' : 'Open original ↗';
    const modelLink = document.querySelector('#dialog-model');
    modelLink.hidden = !model;
    if (model) modelLink.href = `https://sketchfab.com/models/${model}`;
    const element = document.createElement(media === 'video' ? 'video' : media === 'embed' ? 'iframe' : 'img');
    if (media === 'video') {
      element.controls = true;
      element.playsInline = true;
      element.loop = true;
      element.preload = 'metadata';
    } else if (media === 'embed') {
      element.title = title;
      element.allow = 'autoplay; fullscreen; picture-in-picture; xr-spatial-tracking';
      element.allowFullscreen = true;
      element.referrerPolicy = 'strict-origin-when-cross-origin';
    } else element.alt = title;
    if (media === 'video' && webm) {
      for (const [url, type] of [[webm, 'video/webm'], [src, 'video/mp4']]) {
        const sourceElement = document.createElement('source');
        sourceElement.src = url;
        sourceElement.type = type;
        element.append(sourceElement);
      }
    } else element.src = src;
    container.replaceChildren(element);
    dialog.showModal();
    document.body.classList.add('modal-open');
    if (media === 'video') element.play().catch(() => {});
  });
  dialog?.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    const video = container.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.replaceChildren();
      video.load();
    }
    container.replaceChildren();
    document.body.classList.remove('modal-open');
    trigger?.focus({ preventScroll: true });
  });
  document.querySelector('#year').textContent = new Date().getFullYear();
})();
