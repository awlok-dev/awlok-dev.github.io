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

  // Manual scene selection keeps artwork still until the visitor chooses a scene.
  function setupSelector(control, panel) {
    const controls = [...document.querySelectorAll(control)];
    const panels = [...document.querySelectorAll(panel)];
    controls.forEach(link => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      controls.forEach(item => item.setAttribute('aria-current', String(item === link)));
      panels.forEach(item => { item.hidden = item.id !== link.getAttribute('aria-controls'); });
    }));
    // Let a direct scene link select the matching panel on arrival.
    const initial = controls.find(item => item.getAttribute('href') === location.hash);
    if (initial) initial.click();
  }
  setupSelector('[data-hero]', '.hero-slide');
  setupSelector('[data-project]', '.project-feature');

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
