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
    }
  });

  const search = document.querySelector('[data-tool-search]');
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('[data-tool-card]'));
  const empty = document.querySelector('[data-empty-state]');
  let category = 'all';

  function applyFilters() {
    if (!cards.length) return;
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const matchesText = !query || card.textContent.toLowerCase().includes(query);
      const matchesCategory = category === 'all' || card.dataset.category === category;
      card.hidden = !(matchesText && matchesCategory);
      if (!card.hidden) visible += 1;
    });
    if (empty) empty.style.display = visible ? 'none' : 'block';
  }

  search?.addEventListener('input', applyFilters);
  filters.forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.filter;
    filters.forEach((item) => item.classList.toggle('active', item === button));
    applyFilters();
  }));

  document.querySelectorAll('[data-current-year]').forEach((item) => {
    item.textContent = new Date().getFullYear();
  });

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
