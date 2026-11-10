const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:1});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../fold/index.html')+'?film=1'); await p.evaluate(()=>document.fonts.ready);
await p.waitForTimeout(300); await p.evaluate(()=>__film.manual());
let now=0; const ts=process.argv.slice(3).map(Number);
for(const t of ts){ while(now<t){ await p.evaluate(t=>__film.renderAt(t), now+1/30); await p.evaluate(d=>{for(const a of document.getAnimations()){if(a.playState!=='paused')a.pause();a.currentTime=(a.currentTime||0)+d;}},1000/30); now+=1/30; }
  await p.screenshot({path:`${process.argv[2]}/f_${t}.png`}); }
console.log('errors',errs); await b.close(); })();
