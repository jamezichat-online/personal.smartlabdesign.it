// Procedural rail audio: no asset, no network. Metal-on-metal scrape + per-hook "tick" as each hanger passes.
let ctx=null,analyser=null,listeners=[],gain=null,scrape=null,band=null,master=null,muted=false,lastPos=0,ready=false;
try{muted=localStorage.getItem('vsr-mute')==='1'}catch(e){}
function build(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:1;master.connect(ctx.destination);analyser=ctx.createAnalyser();analyser.fftSize=1024;master.connect(analyser);ctx.onstatechange=()=>listeners.forEach(f=>f());
 // 2 s of noise, band-limited, looped: friction of steel on steel.
 const len=ctx.sampleRate*2,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);let b=0;
 for(let i=0;i<len;i++){const w=Math.random()*2-1;b=b*.35+w*.65;d[i]=b*(.55+.45*Math.sin(i/ctx.sampleRate*83*Math.PI*2+Math.sin(i*.0007)*2))}
 scrape=ctx.createBufferSource();scrape.buffer=buf;scrape.loop=true;
 const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1400;
 band=ctx.createBiquadFilter();band.type='bandpass';band.frequency.value=3400;band.Q.value=1.4;
 gain=ctx.createGain();gain.gain.value=0;
 scrape.connect(hp);hp.connect(band);band.connect(gain);gain.connect(master);scrape.start();ready=true;
}
function tick(speed){
 if(!ready||muted||ctx.state!=='running')return;
 const t=ctx.currentTime,v=Math.min(1,speed/5),g=ctx.createGain();
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18+.3*v,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.07+.05*v);
 g.connect(master);
 for(const f of [2350+Math.random()*180,3720+Math.random()*240,5480]){const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;o.connect(g);o.start(t);o.stop(t+.14)}
}
// iOS/iPadOS: Web Audio is silenced by the hardware mute switch unless the page owns a "playback" audio session,
// and the context only starts if a sound is actually played inside the user gesture.
let keep=null;
function iosSession(){try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
 if(keep)return;try{const n=44,w=new DataView(new ArrayBuffer(44+n*2));const S=(o,s)=>{for(let i=0;i<s.length;i++)w.setUint8(o+i,s.charCodeAt(i))};
  S(0,'RIFF');w.setUint32(4,36+n*2,true);S(8,'WAVEfmt ');w.setUint32(16,16,true);w.setUint16(20,1,true);w.setUint16(22,1,true);w.setUint32(24,8000,true);w.setUint32(28,16000,true);w.setUint16(32,2,true);w.setUint16(34,16,true);S(36,'data');w.setUint32(40,n*2,true);
  let bin='';new Uint8Array(w.buffer).forEach(b=>bin+=String.fromCharCode(b));
  keep=new Audio('data:audio/wav;base64,'+btoa(bin));keep.loop=true;keep.volume=.01;keep.setAttribute('playsinline','');keep.play().catch(()=>{})}catch(e){}}
export function unlock(){iosSession();if(!ctx)build();
 if(ctx){try{const b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0)}catch(e){}}if(ctx&&ctx.state==='suspended')ctx.resume().then(()=>listeners.forEach(f=>f())).catch(()=>{})}
export function update(velocity,position,dt){
 if(!ready){lastPos=position;return}
 const s=Math.abs(velocity),k=Math.min(1,s/6),t=ctx.currentTime;
 gain.gain.setTargetAtTime(muted||document.hidden?0:Math.pow(k,.7)*.9,t,.05);
 band.frequency.setTargetAtTime(2600+k*2600,t,.08);
 // A hanger passes every half step (hooks sit at integer positions, the 2nd/3rd neighbours move with them).
 if(Math.floor(position*2)!==Math.floor(lastPos*2)&&s>.35)tick(s);
 lastPos=position;
}
export function setMuted(m){muted=m;try{localStorage.setItem('vsr-mute',m?'1':'0')}catch(e){}if(master)master.gain.setTargetAtTime(m?0:1,ctx.currentTime,.03)}
export function isMuted(){return muted}
export function isRunning(){return !!ctx&&ctx.state==='running'}
export function isActive(){return !muted&&isRunning()}
export function onState(f){listeners.push(f)}
export function ping(){tick(4)}
export function level(){if(!analyser)return -1;const a=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(a);let m=0;for(const v of a)m=Math.max(m,Math.abs(v));return m}
if(typeof window!=='undefined')window.__vsrSound={level,isRunning};
