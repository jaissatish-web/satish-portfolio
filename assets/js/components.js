// Component injection: header, footer, sidebar
const headerTpl = `<header><nav class="navbar"><a href="/" class="navbar-brand">Instrumentation Mastery</a><div class="navbar-links"><a href="/">Home</a><a href="/knowledge/">Library</a><a href="/tools/">Tools</a><button class="theme-toggle" id="theme-toggle">🌙 Dark</button></div></nav></header>`;
const footerTpl = `<footer style="text-align:center;padding:2rem;color:var(--text-muted);">© 2025 Satish Jaiswal. Built for NEOM, ADNOC, and global I&C engineers.</footer>`;

async function loadComponents() {
  document.getElementById('header-placeholder').innerHTML = headerTpl;
  document.getElementById('footer-placeholder').innerHTML = footerTpl;
  document.getElementById('theme-toggle').onclick = toggleTheme;
}