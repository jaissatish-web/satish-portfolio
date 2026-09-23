/* Browser and Node share the same deterministic engineering calculations. */
(function(root){
'use strict';
const check=(ok,message)=>{if(!ok)throw new Error(message)};
const finite=(...xs)=>xs.every(Number.isFinite);
const range=(v,min,max,name)=>check(Number.isFinite(v)&&v>=min&&v<=max,`${name} must be between ${min} and ${max}.`);
const span=(l,u)=>check(finite(l,u)&&u>l,'Upper range must be greater than lower range.');
const bisect=(fn,y,lo,hi)=>{check(y>=fn(lo)-1e-8&&y<=fn(hi)+1e-8,'Value is outside the supported conversion range.');for(let i=0;i<65;i++){const mid=(lo+hi)/2;if(fn(mid)<y)lo=mid;else hi=mid;}return(lo+hi)/2};
const rtd=t=>{range(t,-200,850,'Temperature (°C)');return 100*(1+3.9083e-3*t-5.775e-7*t*t+(t<0?-4.183e-12*(t-100)*t*t*t:0));};
// NIST Monograph 175 forward reference functions. Positive-temperature branches only.
const tcData={K:{max:1372,c:[-.176004136860e-1,.389212049750e-1,.185587700320e-4,-.994575928740e-7,.318409457190e-9,-.560728448890e-12,.560750590590e-15,-.320207200030e-18,.971511471520e-22,-.121047212750e-25]},J:{max:760,c:[0,.503811878150e-1,.304758369300e-4,-.856810657200e-7,.132281952950e-9,-.170529583370e-12,.209480906970e-15,-.125383953360e-18,.156317256970e-22]},T:{max:400,c:[0,.387481063640e-1,.332922278800e-4,.206182434040e-6,-.218822568460e-8,.109968809280e-10,-.308157587720e-13,.454791352900e-16,-.275129016730e-19]}};
function tc(type,t){const d=tcData[type];check(!!d,'Choose K, J or T.');range(t,0,d.max,`${type} temperature (°C)`);let e=0;for(let i=d.c.length-1;i>=0;i--)e=e*t+d.c[i];if(type==='K')e+=.118597600000*Math.exp(-.118343200000e-3*(t-126.9686)**2);return e;}
const api={check,range,span,rtd,tc,tcData,
 signal(l,u,v,reverse=false){span(l,u);check(finite(v),'Enter a finite signal.');return reverse?4+16*(v-l)/(u-l):l+(v-4)*(u-l)/16;},
 dp(dp,max,q){check(finite(dp,max,q)&&dp>=0&&max>0&&q>0,'DP must be nonnegative; maximum DP and flow must be positive.');return q*Math.sqrt(dp/max)},
 rtdInverse:r=>bisect(rtd,r,-200,850),
 tcInverse:(type,e)=>bisect(t=>tc(type,t),e,0,tcData[type].max),
 hydro:(rho,h)=>{check(finite(rho,h)&&rho>0&&h>=0,'Density must be positive and height nonnegative.');return rho*9.80665*h/1000;},
 wet(rho,rhoRef,h,z,ref,wet){check(finite(rho,rhoRef,h,z,ref)&&rho>0&&rhoRef>0&&h>0&&z>=0&&ref>=0,'Densities and span must be positive; heights must be nonnegative.');const l=(rho*z-(wet?rhoRef*ref:0))*9.80665/1000;return{lrv:l,urv:l+rho*9.80665*h/1000}},
 cv(q,sg,dp){check(finite(q,sg,dp)&&q>=0&&sg>0&&dp>0,'Flow must be nonnegative; specific gravity and pressure drop must be positive.');const kv=q*Math.sqrt(sg/dp);return{kv,cv:kv/0.865}},
 budget(v,i,r,device,other){check(finite(v,i,r,device,other)&&v>0&&i>0&&r>=0&&device>=0&&other>=0,'Use positive supply/current and nonnegative drops/resistance.');return{resistive:i*r/1000,margin:v-device-other-i*r/1000,available:v-other-i*r/1000}},
 cable(length,area,i,temp,material){check(finite(length,area,i,temp)&&length>=0&&area>0&&i>=0&&temp>=-20&&temp<=100,'Use nonnegative length/current, positive area, and −20…100 °C.');const rho=material==='aluminium'?.028264:.017241,alpha=material==='aluminium'?.00403:.00393;const resistance=2*length*rho*(1+alpha*(temp-20))/area;return{resistance,drop:resistance*i/1000}},
 ohm(mode,a,b){check(finite(a,b)&&a>0&&b>0,'Both known quantities must be positive.');let v,i,r;if(mode==='VI'){v=a;i=b;r=v/i}else if(mode==='VR'){v=a;r=b;i=v/r}else if(mode==='IR'){i=a;r=b;v=i*r}else if(mode==='VP'){v=a;i=b/v;r=v/i}else if(mode==='IP'){i=a;v=b/i;r=v/i}else{r=a;i=Math.sqrt(b/r);v=i*r}return{v,i,r,p:v*i}},
 error(expected,measured,l,u,tolerance){span(l,u);check(finite(expected,measured,tolerance)&&tolerance>=0,'Enter finite values and a nonnegative tolerance.');const error=measured-expected,pct=100*error/(u-l);return{error,pct,pass:Math.abs(pct)<=tolerance+1e-10}},
 pid(kp,ki,kd,tau,gain,sp,disturbance){[kp,ki,kd].forEach(v=>range(v,0,20,'Controller gains'));range(tau,1,100,'Time constant');range(gain,.1,3,'Process gain');range(sp,1,90,'Setpoint');range(disturbance,-30,30,'Disturbance');let y=0,integral=0,lastY=0;const dt=.1,points=[];for(let n=0;n<=2000;n++){const time=n*dt,error=sp-y,derivative=-(y-lastY)/dt;let candidate=integral+error*dt,raw=kp*error+ki*candidate+kd*derivative;const u=Math.max(0,Math.min(100,raw));if((raw>=0&&raw<=100)||(raw>100&&error<0)||(raw<0&&error>0))integral=candidate;points.push([time,y,u]);lastY=y;y+=(gain*u+(time>=100?disturbance:0)-y)*dt/tau;check(Number.isFinite(y),'Simulation diverged. Reduce gains.')}return points;},
 vote:(a,b,c)=>Number(a)+Number(b)+Number(c)>=2
};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Engineering=api;
})(typeof window!=='undefined'?window:this);
