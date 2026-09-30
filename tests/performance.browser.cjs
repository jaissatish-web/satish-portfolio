/* Defined mobile 3G-style laboratory profile; deploy-time field data will differ. */
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),host=fs.mkdtempSync(path.join(os.tmpdir(),'satish-lcp-'));
fs.symlinkSync(root,path.join(host,'satish-portfolio'),'dir');
const server=require('node:child_process').spawn('python3',['-m','http.server','8767','--bind','127.0.0.1'],{cwd:host,stdio:'ignore'});
(async()=>{let browser;try{
await new Promise(r=>setTimeout(r,400));browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const runs=[];
for(let i=0;i<3;i++){
 const context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage();
 await page.addInitScript(()=>{window.lcp=0;new PerformanceObserver(l=>window.lcp=l.getEntries().at(-1).startTime).observe({type:'largest-contentful-paint',buffered:true});});
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:300,downloadThroughput:750000/8,uploadThroughput:250000/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.goto('http://127.0.0.1:8767/satish-portfolio/');await page.waitForTimeout(1500);runs.push(await page.evaluate(()=>Math.round(window.lcp)));await context.close();
}
console.log(JSON.stringify({profile:'375x812; 750 kbps down / 250 kbps up; 300 ms latency; 4x CPU; empty cache; local static server',lcpMs:runs},null,2));if(runs.some(n=>!n||n>=2500))throw Error('LCP target failed');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
