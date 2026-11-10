const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:process.env.V?{width:1080,height:1920}:{width:1920,height:1080}});
await p.goto('file://'+path.join(__dirname,'index.html')+'?render=1'+(process.env.V?'&v=1':'')); await p.evaluate(()=>document.fonts.ready);
for(const t of process.argv.slice(3)){ await p.evaluate(t=>render(t),+t); await p.screenshot({path:`${process.argv[2]}/s_${t}.png`}); }
await b.close(); })();
