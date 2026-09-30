/* Progressive navigation and cosmetic effects only. Calculations are untouched. */
(() => {
  document.documentElement.classList.add('enhanced');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion = () => document.documentElement.classList.toggle('motion-ready', !motion.matches);
  syncMotion(); motion.addEventListener('change', syncMotion);
  const bar = document.createElement('div');bar.className='scroll-progress';bar.setAttribute('aria-hidden','true');document.body.append(bar);
  let scheduled=false;
  const draw=()=>{const max=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`;scheduled=false;};
  addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(draw);}},{passive:true});addEventListener('resize',draw);draw();
  document.querySelectorAll('.nav-links a').forEach(link=>link.addEventListener('click',()=>{document.querySelector('.nav-links')?.classList.remove('open');document.querySelector('.menu-button')?.setAttribute('aria-expanded','false');}));
  // Return keyboard focus to the menu trigger when Escape closes the menu.
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && event.target.closest('.nav-links'))document.querySelector('.menu-button')?.focus();});
})();
