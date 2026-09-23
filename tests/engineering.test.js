const assert=require('node:assert/strict');const m=require('../assets/js/engineering-math.js');let count=0;
function close(actual,expected,tol=1e-8){assert.ok(Math.abs(actual-expected)<=tol,`${actual} != ${expected}`);count++}
function rejects(fn){assert.throws(fn);count++}
// Independent hand-worked engineering examples, boundaries and reference-table checks.
close(m.signal(-50,150,12),50);close(m.signal(-50,150,100,true),16);close(m.signal(0,100,4),0);close(m.signal(0,100,20),100);rejects(()=>m.signal(100,100,12));
close(m.dp(25,100,200),100);close(m.dp(0,100,200),0);rejects(()=>m.dp(-1,100,200));rejects(()=>m.dp(1,0,200));
close(m.rtd(0),100);close(m.rtd(100),138.5055);close(m.rtd(-200),18.52008);close(m.rtd(850),390.481125);[-200,-100,0,100,500,850].forEach(t=>close(m.rtdInverse(m.rtd(t)),t,1e-6));rejects(()=>m.rtd(-201));rejects(()=>m.rtdInverse(1));
// NIST ITS-90 tabulated EMFs, rounded to 0.001 mV at 100 °C.
close(m.tc('K',100),4.096,.0005);close(m.tc('J',100),5.269,.0005);close(m.tc('T',100),4.279,.0005);close(m.tc('K',1000),41.276,.0005);
for(const type of ['K','J','T'])for(const t of [0,25,100,m.tcData[type].max])close(m.tcInverse(type,m.tc(type,t)),t,1e-5);
const measured=m.tc('K',100)-m.tc('K',25);close(m.tcInverse('K',measured+m.tc('K',25)),100,1e-6);rejects(()=>m.tc('T',401));rejects(()=>m.tcInverse('K',60));
close(m.hydro(1000,2.5),24.516625);rejects(()=>m.hydro(0,1));let w=m.wet(800,1000,4,1,5,true);close(w.lrv,-41.18793);close(w.urv,-9.80665);let dry=m.wet(800,1000,4,1,5,false);close(dry.lrv,7.84532);close(dry.urv,39.2266);
close(m.cv(10,1,1).kv,10);close(m.cv(10,1,1).cv,11.5606936416,1e-8);rejects(()=>m.cv(10,1,0));
close(m.budget(24,20,250,12,2).margin,5);close(m.budget(18,20,500,12,2).margin,-6);rejects(()=>m.budget(24,-1,250,12,2));
let cable=m.cable(500,1.5,20,20,'copper');close(cable.resistance,11.494);close(cable.drop,.22988);assert.ok(m.cable(500,1.5,20,80,'copper').drop>cable.drop);rejects(()=>m.cable(100,0,20,20,'copper'));
for(const [mode,a,b] of [['VI',24,.02],['VR',24,1200],['IR',.02,1200],['VP',24,.48],['IP',.02,.48],['RP',1200,.48]]){let o=m.ohm(mode,a,b);close(o.v,24);close(o.i,.02);close(o.r,1200);close(o.p,.48)}rejects(()=>m.ohm('VI',24,0));
let error=m.error(50,50.2,0,100,.25);close(error.pct,.2);assert.equal(error.pass,true);assert.equal(m.error(50,49.7,0,100,.25).pass,false);assert.equal(m.error(50,50.25,0,100,.25).pass,true);rejects(()=>m.error(0,1,0,0,.25));
for(let a=0;a<=1;a++)for(let b=0;b<=1;b++)for(let c=0;c<=1;c++){assert.equal(m.vote(a,b,c),a+b+c>=2);count++}
let p=m.pid(2,.1,0,10,1,50,0);close(p.at(-1)[1],50,.1);assert.ok(p.every(x=>x[2]>=0&&x[2]<=100));let disturbed=m.pid(2,.1,0,10,1,50,-10);close(disturbed.at(-1)[1],50,.15);rejects(()=>m.pid(2,.1,0,0,1,50,0));
console.log(`Passed ${count} numerical assertions, all voting combinations, PID output limits and recovery checks.`);
