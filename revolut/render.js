// node render.js [--preview t1 t2 ...]  -> frames + mp4 (needs ffmpeg, python3 audio.py first)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
(async()=>{
  const args=process.argv.slice(2),prev=args[0]==='--preview';
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
  await p.goto('file://'+path.resolve(__dirname,'spot.html'));
  await p.evaluate(async()=>{window.__export=1;await document.fonts.load('900 100px "Inter Display"');await document.fonts.load('600 40px "JetBrains Mono"');});
  const grab=async t=>Buffer.from((await p.evaluate(t=>{render(t);return document.getElementById('c').toDataURL('image/jpeg',.95)},t)).split(',')[1],'base64');
  if(prev){fs.mkdirSync('preview',{recursive:true});for(const t of args.slice(1))fs.writeFileSync(`preview/f_${t}.jpg`,await grab(+t));await b.close();return;}
  const dir=process.env.FRAMES||'frames';fs.mkdirSync(dir,{recursive:true});
  const N=13*30;for(let f=0;f<N;f++){fs.writeFileSync(`${dir}/${String(f).padStart(4,'0')}.jpg`,await grab(f/30));if(f%30==0)console.log('frame',f);}
  await b.close();
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',`${dir}/%04d.jpg`,'-i','spot_audio.wav','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-shortest','-movflags','+faststart','../out/revolut_spot.mp4'],{stdio:'inherit'});
  console.log('done -> out/revolut_spot.mp4');
})();
