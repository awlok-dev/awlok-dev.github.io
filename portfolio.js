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
  setupSelector('[data-project]', '.project-feature');

  // Progressive enhancement: content is visible without JS or observer support.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
    const targets = document.querySelectorAll('.section-heading, .project-feature, .project-selectors, .vfx-stage, .art-piece, .model-list, .work-card, .contact-inner, .project-heading, .project-cover, .project-story, .project-gallery > a');
    targets.forEach(target => {
      target.classList.add('scroll-reveal');
      // Sibling artwork arrives in a short sequence rather than all at once.
      if (target.matches('.art-piece, .work-card, .project-gallery > a')) {
        const index = [...target.parentElement.children].indexOf(target);
        target.style.setProperty('--reveal-delay', `${(index % 3) * 85}ms`);
      }
      revealObserver.observe(target);
    });
    document.addEventListener('focusin', event => {
      event.target.closest('.scroll-reveal')?.classList.add('is-visible');
    });
    reducedMotion.addEventListener('change', () => {
      if (!reducedMotion.matches) return;
      targets.forEach(target => target.classList.add('is-visible'));
      revealObserver.disconnect();
    });
  }

  const player = document.querySelector('#vfx-player');
  const play = document.querySelector('.vfx-play');
  if (player && play) {
    const playClip = () => {
      play.hidden = true;
      player.play().catch(() => { play.hidden = false; });
    };
    play.addEventListener('click', playClip);
    player.addEventListener('play', () => { play.hidden = true; });
    document.querySelectorAll('[data-clip]').forEach(link => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      player.pause();
      player.replaceChildren();
      player.removeAttribute('src');
      player.poster = link.dataset.poster;
      const sources = link.dataset.webm ? [[link.dataset.webm, 'video/webm'], [link.dataset.clip, 'video/mp4']] : [[link.dataset.clip, 'video/mp4']];
      sources.forEach(([src, type]) => {
        const source = document.createElement('source');
        source.src = src;
        source.type = type;
        player.append(source);
      });
      player.setAttribute('aria-label', `${link.dataset.title} visual effect`);
      play.setAttribute('aria-label', `Play ${link.dataset.title} visual effect`);
      document.querySelector('#vfx-current').textContent = link.dataset.title;
      document.querySelectorAll('[data-clip]').forEach(item => item.setAttribute('aria-current', String(item === link)));
      player.load();
      playClip();
    }));
    // Stop playback when the visitor leaves the player or switches browser tabs.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) player.pause();
      }, { threshold: 0.1 }).observe(player);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); });
  }

  const cards = [...document.querySelectorAll('.work-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const more = document.querySelector('#load-more');
  let selected = 'all';
  let visible = 9;
  function filterWork(category, updateUrl = true) {
    selected = ['all', 'games', 'interactive', 'vfx', 'art'].includes(category) ? category : 'all';
    visible = 9;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === selected)));
    renderWork();
    if (updateUrl) {
      const url = new URL(location.href);
      if (selected === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', selected);
      history.replaceState(null, '', url);
    }
  }
  function renderWork() {
    let count = 0;
    cards.forEach(card => {
      const matches = selected === 'all' || card.dataset.category === selected;
      if (matches) count++;
      card.hidden = !matches || count > visible;
    });
    document.querySelector('#work-count').textContent = `${Math.min(count, visible)} / ${count} works`;
    more.hidden = count <= visible;
  }
  if (cards.length) {
    filters.forEach(button => button.addEventListener('click', () => filterWork(button.dataset.filter)));
    more.addEventListener('click', () => {
      const next = cards.filter(card => selected === 'all' || card.dataset.category === selected)[visible];
      visible += 9;
      renderWork();
      next?.querySelector('a')?.focus({ preventScroll: true });
    });
    filterWork(new URL(location.href).searchParams.get('filter') || 'all', false);
    document.querySelectorAll('[data-filter-link]').forEach(link => link.addEventListener('click', () => {
      filterWork(link.dataset.filterLink);
    }));
    // Preserve incoming links to the previous portfolio sections.
    const aliases = { '#gallery': '#work', '#home': '#top' };
    if (aliases[location.hash]) {
      const target = aliases[location.hash];
      history.replaceState(null, '', location.pathname + location.search + target);
      document.querySelector(target)?.scrollIntoView();
    }
  } else {
    document.querySelectorAll('[data-filter-link]').forEach(link => {
      link.href = `index.html?filter=${encodeURIComponent(link.dataset.filterLink)}#work`;
    });
  }

  const dialog = document.querySelector('#media-dialog');
  const container = dialog?.querySelector('.dialog-media');
  let trigger = null;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-media]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !dialog?.showModal) return;
    event.preventDefault();
    player?.pause();
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
