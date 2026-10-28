(function () {
  const base = '/satish-portfolio/';

  window.siteBase = base;
  window.toggleMenu = function () {
    const links = document.querySelector('.nav-links');
    const button = document.querySelector('.menu-button');
    if (!links || !button) return;
    const open = links.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  };

  document.addEventListener('click', (event) => {
    const menu = document.querySelector('.nav-links');
    if (menu && menu.classList.contains('open') && !event.target.closest('.site-header')) {
      menu.classList.remove('open');
      document.querySelector('.menu-button')?.setAttribute('aria-expanded', 'false');
    }
  });

  /* Mark the navigation entry for the current page (header + bottom tabs). */
  const current = location.pathname.replace(/\/$/, '');
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((link) => {
    const href = (link.getAttribute('href') || '').replace(/\/$/, '');
    if (href && (href === current || (current + '.html') === href || (href + '.html') === current || (href === base.replace(/\/$/, '') && current === ''))) {
      link.setAttribute('aria-current', 'page');
    }
  });

  /* Search: every [data-tool-search] input stays in sync and matches tool
     cards by visible text plus data-aliases (e.g. "hart", "cv", "pt100"). */
  const searches = Array.from(document.querySelectorAll('[data-tool-search]'));
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('[data-tool-card]'));
  const readyOnly = document.querySelector('#ready-only');
  const empty = document.querySelector('[data-empty-state]');
  const countLabel = document.querySelector('[data-search-count]');
  let category = 'all';

  function applyFilters() {
    if (!cards.length) { if (countLabel) countLabel.textContent = ''; return; }
    const query = (searches.find((s) => s.value)?.value || searches[0]?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const haystack = (card.textContent + ' ' + (card.dataset.aliases || '')).toLowerCase();
      const matchesText = !query || haystack.includes(query);
      const matchesCategory = category === 'all' || !card.dataset.kind || card.dataset.kind === category;
      card.hidden = !(matchesText && matchesCategory && (!readyOnly?.checked || card.dataset.status === 'available'));
      if (!card.hidden) visible += 1;
    });
    if (empty) empty.style.display = visible ? 'none' : 'block';
    if (countLabel) countLabel.textContent = query ? (visible + (visible === 1 ? ' tool' : ' tools') + ' found') : '';
  }

  searches.forEach((search) => {
    search.addEventListener('input', () => {
      searches.forEach((other) => { if (other !== search) other.value = search.value; });
      applyFilters();
    });
  });
  readyOnly?.addEventListener('change', applyFilters);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { document.querySelector('.nav-links')?.classList.remove('open'); document.querySelector('.menu-button')?.setAttribute('aria-expanded', 'false'); } });
  filters.forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.filter;
    filters.forEach((item) => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    applyFilters();
  }));

  applyFilters();
  document.querySelectorAll('[data-current-year]').forEach((item) => {
    item.textContent = new Date().getFullYear();
  });

  /* Offline-ready PWA: register the service worker (subpath-scoped, GitHub Pages). */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(base + 'service-worker.js').catch(() => { /* offline support is progressive */ });
    });
  }

  window.copyText = async function (text, button) {
    try {
      await navigator.clipboard.writeText(text);
      if (button) {
        const previous = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = previous; }, 1400);
      }
    } catch (_) {
      window.prompt('Copy this result:', text);
    }
  };
})();
