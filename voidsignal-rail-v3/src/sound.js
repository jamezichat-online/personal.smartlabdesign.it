// Procedural rail audio: no asset, no network. Metal-on-metal scrape + per-hook "tick" as each hanger passes.
let ctx=null,gain=null,scrape=null,band=null,master=null,muted=false,lastPos=0,ready=false;
try{muted=localStorage.getItem('vsr-mute')==='1'}catch(e){}
function build(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:1;master.connect(ctx.destination);
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
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05+.09*v,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.07+.05*v);
 g.connect(master);
 for(const f of [2350+Math.random()*180,3720+Math.random()*240,5480]){const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;o.connect(g);o.start(t);o.stop(t+.14)}
}
export function unlock(){if(!ctx)build();if(ctx&&ctx.state==='suspended')ctx.resume()}
export function update(velocity,position,dt){
 if(!ready){lastPos=position;return}
 const s=Math.abs(velocity),k=Math.min(1,s/6),t=ctx.currentTime;
 gain.gain.setTargetAtTime(muted||document.hidden?0:Math.pow(k,.8)*.2,t,.05);
 band.frequency.setTargetAtTime(2600+k*2600,t,.08);
 // A hanger passes every half step (hooks sit at integer positions, the 2nd/3rd neighbours move with them).
 if(Math.floor(position*2)!==Math.floor(lastPos*2)&&s>.35)tick(s);
 lastPos=position;
}
export function setMuted(m){muted=m;try{localStorage.setItem('vsr-mute',m?'1':'0')}catch(e){}if(master)master.gain.setTargetAtTime(m?0:1,ctx.currentTime,.03)}
export function isMuted(){return muted}
