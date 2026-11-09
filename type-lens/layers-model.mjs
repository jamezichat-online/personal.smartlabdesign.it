// Hidden layers: the four ways of looking under the same hero image.
export const LAYER_RATIO=1920/1080;
export const LAYERS=[
 {id:'blueprint',name:'Blueprint',caption:'Structure / Under the style',label:'BLUEPRINT',home:[.28,.46],description:'La struttura sotto lo stile: linee, volumi e griglia della scena.',live:'Sotto lo stile c’è una struttura.'},
 {id:'palette',name:'Palette',caption:'Colour script / Extracted',label:'PALETTE',home:[.15,.56],description:'Il colour script estratto dall’immagine: sei colori dominanti.',live:'Muovi la lente: ogni zona ha il suo colore.'},
 {id:'prompt',name:'The prompt',caption:'The idea / Behind the image',label:'PROMPT',home:[.27,.50],description:'L’idea dietro l’immagine, scritta riga per riga.',live:'L’idea dietro l’immagine.'},
 {id:'multi',name:'Multi style',caption:'Same scene / Four looks',label:'STYLE',home:[.25,.50],description:'La stessa scena in quattro stili: comic, sketch, duotone, real.',live:'Stessa scena, quattro stili.'}
];
export const STYLES=[{id:'comic',label:'STYLE · COMIC'},{id:'sketch',label:'STYLE · SKETCH'},{id:'duotone',label:'STYLE · DUOTONE'},{id:'real',label:'STYLE · REAL'}];
export const STYLE_MS=1300;
export const PALETTE=['#e49b54','#c11f0d','#9d5b1e','#7f877f','#373b24','#0f211a'];
export const PROMPT_LINES=['PROMPT','neon sign,','golden hour,','palm avenue,','retro Miami,','painterly.'];
export const TYPE_CPS=20,LINE_STAGGER=8,PROMPT_HOLD=2.4;
export function layerById(id){return LAYERS.find(l=>l.id===id)||LAYERS[0]}
export function nearestPalette(rgb,pal=PALETTE){let best=0,bd=Infinity;pal.forEach((hex,i)=>{const c=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)),d=(c[0]-rgb[0])**2+(c[1]-rgb[1])**2+(c[2]-rgb[2])**2;if(d<bd){bd=d;best=i}});return best}
export function styleIndexAt(ms){return Math.floor(Math.max(0,ms)/STYLE_MS)%STYLES.length}
// Characters visible on each line after `seconds` of typing (lines start staggered, like the reel).
export function typedLines(seconds,lines=PROMPT_LINES){return lines.map((l,i)=>l.slice(0,Math.max(0,Math.min(l.length,Math.floor(seconds*TYPE_CPS-i*LINE_STAGGER)))))}
export function typingDuration(lines=PROMPT_LINES){return (lines.length-1)*LINE_STAGGER/TYPE_CPS+Math.max(...lines.map(l=>l.length))/TYPE_CPS}
