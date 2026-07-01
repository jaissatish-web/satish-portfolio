// Main utilities: theme, search, daily challenge
function initTheme() { 
  const saved = localStorage.getItem('theme') || 'dark'; 
  document.documentElement.setAttribute('data-theme', saved); 
}

function toggleTheme() { 
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.getElementById('theme-toggle').textContent = next === 'dark' ? '🌙 Dark' : '☀️ Light';
}

function initDailyChallenge() {
  const challenges = [
    { q: "What is 4-20mA span?", opts: ["0-20mA", "4-20mA", "0-100%"], a: 1, e: "4-20mA represents the full measurement range." },
    { q: "In 2oo3, how many sensors trigger trip?", opts: ["1", "2", "3"], a: 1, e: "Two of three must agree to initiate trip." },
    { q: "NAMUR NE43 failure range?", opts: ["3.8-21.2mA", "4-20mA", "0-24mA"], a: 0, e: "3.8-21.2mA indicates sensor failure." }
  ];
  const c = document.querySelector('.daily-challenge'); if (!c) return;
  const today = new Date(); const day = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const ch = challenges[day % challenges.length];
  c.innerHTML = `<h3>🎯 Daily Challenge</h3><div class="challenge-question">${ch.q}</div><div class="challenge-options">${ch.opts.map((o,i)=>`<div class="challenge-option" data-i="${i}">${o}</div>`).join('')}</div><div class="challenge-feedback" id="cf"></div>`;
  document.querySelectorAll('.challenge-option').forEach(o => {
    o.onclick = function() { 
      const i = +this.dataset.i; const f = document.getElementById('cf');
      if (i === ch.a) { f.className = 'challenge-feedback correct'; f.innerHTML = `<strong>Correct!</strong> ${ch.e}`; }
      else { f.className = 'challenge-feedback incorrect'; f.innerHTML = `<strong>Try again!</strong> ${ch.e}`; }
      f.style.display = 'block'; 
    };
  });
}

async function loadContentMap() { 
  const r = await fetch('/assets/data/content-map.json'); 
  const d = await r.json(); 
  return d.lessons || []; 
}

function initSearch(inputId, resultsId, data) {
  const input = document.getElementById(inputId); const results = document.getElementById(resultsId);
  if (!input || !results) return;
  input.oninput = function() {
    const v = this.value.toLowerCase();
    if (v.length < 2) { results.innerHTML = ''; return; }
    results.innerHTML = data.filter(d => d.title.toLowerCase().includes(v) || d.category.toLowerCase().includes(v)).slice(0,5).map(d => `<a href="/knowledge/${d.category}/${d.slug}.html" style="display:block;padding:0.5rem;">${d.title}</a>`).join('');
  };
}

document.addEventListener('DOMContentLoaded', initTheme);