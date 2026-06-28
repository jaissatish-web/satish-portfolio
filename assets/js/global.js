/* Global Header & Command Palette JS */

(function() {
  'use strict';

  // ===== HEADER SCROLL =====
  const header = document.getElementById('global-header');
  window.addEventListener('scroll', () => {
    if (!header) return;
    if (window.scrollY > 10) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  });

  // ===== MOBILE MENU (simple =====hamburger toggle) =====
  const mobBtn = document.getElementById('mobile-btn');
  const mobMenu = document.getElementById('mobile-menu');
  if (mobBtn && mobMenu) {
    mobBtn.addEventListener('click', () => mobMenu.classList.toggle('hidden'));
    document.querySelectorAll('.mob-nav').forEach(a => a.addEventListener('click', () => mobMenu.classList.add('hidden')));
  }

  // ===== COMMAND PALETTE =====
  const commands = [
    { icon: '✧', label: 'Go to Portfolio Home', desc: 'index.html', action: () => nav('index.html') },
    { icon: '✧', label: 'Open Engineering Toolkit', desc: 'tools.html', action: () => nav('tools.html') },
    { icon: '✧', label: 'View Mega-Project Track', desc: 'Experience timeline', action: () => nav('index.html#experience') },
    { icon: '✧', label: 'View Key Metrics', desc: 'Achievements section', action: () => nav('index.html#achievements') },
    { icon: '✧', label: 'Download CV', desc: 'Premium resume PDF', action: () => nav('assets/docs/Satish_Jaiswal_Resume.pdf') },
    { icon: '✧', label: 'Send Message', desc: 'Contact mobilisation', action: () => nav('index.html#contact') },
    { icon: '⚙', label: '4-20mA Calculator', desc: 'Loop signal converter', action: () => nav('tools.html#ma-calculator') },
    { icon: '⚙', label: 'PV Scaler', desc: 'Engineering units', action: () => nav('tools.html#pv-calculator') },
    { icon: '⚙', label: 'DP Flow Extractor', desc: 'Square root calculator', action: () => nav('tools.html#dp-flow') },
    { icon: '⚙', label: 'RTD Pt100', desc: 'Temperature lookup', action: () => nav('tools.html#rtd-pt100') },
    { icon: '⚙', label: 'Loop Checklist', desc: 'Pre-commissioning', action: () => nav('tools.html#loop-checklist') },
  ];

  let selectedIndex = 0;

  function nav(url) {
    window.location.href = url;
    togglePalette();
  }

  window.togglePalette = function() {
    const cp = document.getElementById('command-palette');
    const input = document.getElementById('cp-input');
    if (cp.classList.contains('open')) {
      cp.classList.remove('open');
      selectedIndex = 0;
    } else {
      cp.classList.add('open');
      input.value = '';
      input.focus();
      selectedIndex = 0;
      renderCommands('');
    }
  };

  function renderCommands(filter) {
    const list = document.getElementById('cp-list');
    const filtered = commands.filter(c =>
      c.label.toLowerCase().includes(filter.toLowerCase()) ||
      c.desc.toLowerCase().includes(filter.toLowerCase())
    );
    list.innerHTML = filtered.map((c, i) =>
      `<a href="#" class="cp-item ${i === selectedIndex ? 'selected' : ''}" data-idx="${i}" onclick="event.preventDefault();commands[${commands.indexOf(c)}].action()">
        <div class="cp-item-icon">${c.icon}</div>
        <div class="cp-item-label">${c.label}</div>
        <div class="cp-item-desc">${c.desc}</div>
      </a>`
    ).join('');
    selectedIndex = Math.min(selectedIndex, filtered.length - 1);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      togglePalette();
    }
    if (e.key === 'Escape') {
      togglePalette();
    }
    if (document.getElementById('command-palette').classList.contains('open')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, commands.length - 1);
        renderCommands(document.getElementById('cp-input').value);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderCommands(document.getElementById('cp-input').value);
      }
      if (e.key === 'Enter') {
        const item = document.querySelectorAll('.cp-item')[selectedIndex];
        if (item) item.click();
      }
    }
    // Filter input
    if (document.getElementById('command-palette').classList.contains('open') && e.key.length === 1) {
      renderCommands(document.getElementById('cp-input').value);
    }
  });

  // Input handler
  const cpInput = document.getElementById('cp-input');
  if (cpInput) {
    cpInput.addEventListener('input', () => renderCommands(cpInput.value));
  }

  // ===== COUNTER ANIMATION =====
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        const target = parseFloat(el.dataset.target);
        const decimals = parseInt(el.dataset.decimals || '0');
        const suffix = el.dataset.suffix || '';
        const dur = 1800;
        const start = performance.now();
        function tick(now) {
          const prog = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - prog, 3);
          el.textContent = (ease * target).toFixed(decimals) + suffix;
          if (prog < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        counterObs.unobserve(el);
      }
    });
  }, { threshold: .5 });
  document.querySelectorAll('[data-target]').forEach(el => counterObs.observe(el));

  // ===== REVEAL ON SCROLL =====
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('active');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

})();
