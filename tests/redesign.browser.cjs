/* Run from repository root; Playwright is development-only, never shipped to browsers. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const host=fs.mkdtempSync(path.join(os.tmpdir(),'satish-preview-'));fs.symlinkSync(root,path.join(host,'satish-portfolio'),'dir');
const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1'],{cwd:host,stdio:'ignore'});
const base='http://127.0.0.1:8766/satish-portfolio/';
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const routes=['index.html',...['tools','portfolio','blog','knowledge'].flatMap(d=>walk(path.join(root,d)).filter(f=>f.endsWith('.html')).map(f=>path.relative(root,f)))].filter(f=>!f.endsWith('article-template.html')&&f!=='tools/index.html');
async function checkContrast(page){return page.evaluate(()=>{
 const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
 const bad=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const n=walker.currentNode,e=n.parentElement;
  if(!n.textContent.trim()||!e||['SCRIPT','STYLE','NOSCRIPT'].includes(e.tagName)||e.closest('svg')||!e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
  const style=getComputedStyle(e);let p=e,bg='rgb(10, 14, 23)';
  while(p){const color=getComputedStyle(p).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent'){bg=color;break;}p=p.parentElement;}
  const l1=lum(style.color),l2=lum(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  if(ratio<4.5)bad.push({text:n.textContent.trim().slice(0,60),ratio:+ratio.toFixed(2),class:e.className,color:style.color,bg});
 }return bad;
});}
(async()=>{let browser;try{
 await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[],contrast=[],targets=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [375,768,1440]){
  await page.setViewportSize({width,height:812});
  for(const route of routes){
   const response=await page.goto(base+route);assert.equal(response.status(),200,route);
   await page.waitForTimeout(30);
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push(`overflow ${width} ${route}`);
   assert.equal(await page.locator('link[rel=stylesheet]').count(),1,route+' single theme');
   if(width===375){const bad=await checkContrast(page);if(bad.length)contrast.push({route,bad});
 const small=await page.locator('a,button,input,select,textarea').evaluateAll(nodes=>nodes.filter(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(e=>{let target=e;if(e.type==='checkbox')target=e.closest('label')||e;const r=target.getBoundingClientRect();return {tag:e.tagName,text:(e.textContent||e.getAttribute('aria-label')||e.id).slice(0,60),w:r.width,h:r.height};}).filter(e=>e.w<43.9||e.h<43.9));if(small.length)targets.push({route,small});
 assert.equal(await page.locator('img:not([alt]), img[alt=""]').count(),0,'alt text '+route);
 }
  }
  await page.goto(base);await page.waitForTimeout(600);await page.screenshot({path:path.join(host,`homepage-${width}.png`),fullPage:true});
  if(width===375){
   const primary=page.getByRole('link',{name:'Explore free tools',exact:true});assert(await primary.isVisible());assert((await primary.boundingBox()).y+(await primary.boundingBox()).height<734,'mobile primary CTA above bottom nav');
   assert(await page.locator('.engineer-name').isVisible());assert(await page.locator('.engineer-role').isVisible());
   for(const label of ['Projects','About','Tools','Knowledge','Journal'])assert(await page.locator('.mobile-nav').getByRole('link',{name:label,exact:true}).isVisible());
   assert(await page.locator('.contact-pill').isVisible());
   await page.getByRole('button',{name:'Menu ☰'}).click();assert(await page.locator('#site-links').isVisible());await page.keyboard.press('Escape');assert(!await page.locator('#site-links').isVisible());
  }
 }
 await page.goto(base);await page.getByRole('searchbox').fill('Pt100');assert.equal(await page.locator('[data-tool-card]:visible').count(),1);await page.getByRole('searchbox').fill('');assert.equal(await page.locator('[data-tool-card]:visible').count(),18);
 await page.goto(base+'tools/ma-converter.html');await page.locator('#value').fill('20');assert((await page.locator('#live-results').innerText()).includes('100'));
 await page.goto(base+'tools/loop-checklist.html');await page.locator('#tag').fill('REDESIGN-TEST');await page.locator('#tag').press('Tab');await page.locator('#check-0').selectOption('pass');await page.reload();await page.locator('#tag').fill('REDESIGN-TEST');await page.locator('#tag').press('Tab');assert.equal(await page.locator('#check-0').inputValue(),'pass');
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}}),nj=await nojs.newPage();
 for(const route of routes){await nj.goto(base+route);assert(await nj.locator('h1').first().isVisible(),'No-JS heading '+route);assert(await nj.locator('.nav-links').isVisible(),'No-JS navigation '+route);}
 await nj.goto(base);assert.equal(await nj.locator('[data-tool-card]:visible').count(),18);await nojs.close();
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);assert.equal(await page.locator('html.motion-ready').count(),0);
 console.log(JSON.stringify({pages:routes.length,errors,contrast,targets,screenshots:host},null,2));
 assert.equal(errors.length,0,'browser/overflow errors');assert.equal(contrast.length,0,'text contrast');assert.equal(targets.length,0,'touch targets');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
