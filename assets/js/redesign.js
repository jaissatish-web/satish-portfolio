/* Progressive navigation, theme and cosmetic effects only. Calculations are untouched. */
(() => {
  document.documentElement.classList.add('enhanced');

  /* Theme: light is the default (field use); prefers-color-scheme or an
     explicit stored choice may select dark. Persisted in localStorage. */
  const KEY = 'sj-theme';
  const applyTheme = () => {
    const stored = localStorage.getItem(KEY);
    const dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = stored || (dark ? 'dark' : 'light');
  };
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    const updateLabel = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    };
    toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      document.documentElement.dataset.theme = next;
      updateLabel();
    });
    applyTheme();
    updateLabel();
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem(KEY)) applyTheme();
  });

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion = () => document.documentElement.classList.toggle('motion-ready', !motion.matches);
  syncMotion(); motion.addEventListener('change', syncMotion);
  const bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar);
  let scheduled = false;
  const draw = () => { const max = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`; scheduled = false; };
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(draw); } }, { passive: true }); addEventListener('resize', draw); draw();
  document.querySelectorAll('.nav-links a').forEach((link) => link.addEventListener('click', () => { document.querySelector('.nav-links')?.classList.remove('open'); document.querySelector('.menu-button')?.setAttribute('aria-expanded', 'false'); }));
  // Return keyboard focus to the menu trigger when Escape closes the menu.
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && event.target.closest('.nav-links')) document.querySelector('.menu-button')?.focus(); });
})();
