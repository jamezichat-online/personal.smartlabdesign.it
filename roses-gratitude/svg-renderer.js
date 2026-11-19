/* SVG scene writer. Canvas is used only for font metrics and glyph analysis. */
(function(root){
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=v=>Number.isFinite(v)?+v.toFixed(4):0;
class SVGPath{
 constructor(){this.parts=[]}
 moveTo(x,y){this.parts.push(`M${num(x)} ${num(y)}`)}
 lineTo(x,y){this.parts.push(`L${num(x)} ${num(y)}`)}
 bezierCurveTo(a,b,c,d,e,f){this.parts.push(`C${[a,b,c,d,e,f].map(num).join(' ')}`)}
 quadraticCurveTo(a,b,c,d){this.parts.push(`Q${[a,b,c,d].map(num).join(' ')}`)}
 closePath(){this.parts.push('Z')}
 ellipse(x,y,rx,ry,rotation,start,end){const span=end-start,segments=Math.max(1,Math.ceil(Math.abs(span)/Math.PI)),point=a=>[x+rx*Math.cos(a)*Math.cos(rotation)-ry*Math.sin(a)*Math.sin(rotation),y+rx*Math.cos(a)*Math.sin(rotation)+ry*Math.sin(a)*Math.cos(rotation)];let p=point(start);this.moveTo(...p);for(let i=1;i<=segments;i++){p=point(start+span*i/segments);this.parts.push(`A${num(rx)} ${num(ry)} ${num(rotation*180/Math.PI)} 0 ${span>=0?1:0} ${p.map(num).join(' ')}`)}}
 toString(){return this.parts.join(' ')}
}
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
class SVGScene{
 constructor(element,metrics){this.element=element;this.metrics=metrics;this.serial=0;this.cache=new Map();this.reset();this.state={matrix:[1,0,0,1,0,0],fillStyle:'#000',strokeStyle:'#000',lineWidth:1,lineCap:'butt',lineJoin:'miter',font:'14px sans-serif',textBaseline:'alphabetic',clips:[]};this.stack=[]}
 reset(){this.drawSerial=0;this.nodes=[];this.defs=[];this.usedSymbols=new Set();this.frameSymbols=[]}
 clearRect(){this.reset()}
 save(){this.stack.push({...this.state,matrix:[...this.state.matrix],clips:[...this.state.clips]})}
 restore(){if(this.stack.length)this.state=this.stack.pop()}
 translate(x,y){this.state.matrix=multiply(this.state.matrix,[1,0,0,1,x,y])}
 rotate(a){this.state.matrix=multiply(this.state.matrix,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0])}
 scale(x,y){this.state.matrix=multiply(this.state.matrix,[x,0,0,y,0,0])}
 beginPath(){this.path=new SVGPath()}
 moveTo(...a){this.path.moveTo(...a)}lineTo(...a){this.path.lineTo(...a)}bezierCurveTo(...a){this.path.bezierCurveTo(...a)}quadraticCurveTo(...a){this.path.quadraticCurveTo(...a)}ellipse(...a){this.path.ellipse(...a)}closePath(){this.path.closePath()}
 matrix(){return `matrix(${this.state.matrix.map(num).join(' ')})`}
 paint(p){if(typeof p==='object')return `url(#${p.id})`;let match=String(p).match(/^hsl\(([\d.]+),([\d.]+)%,([\d.]+)%\)$/);if(match){let h=+match[1]/360,s=+match[2]/100,l=+match[3]/100,a=s*Math.min(l,1-l),f=n=>{let k=(n+h*12)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))};return '#'+[f(0),f(8),f(4)].map(v=>v.toString(16).padStart(2,'0')).join('')}return esc(p)}
 add(node){for(const clip of this.state.clips)node=`<g clip-path="url(#${clip})">${node}</g>`;this.nodes.push(node)}
 fill(path=this.path){this.add(`<path d="${path}" transform="${this.matrix()}" fill="${this.paint(this.fillStyle)}"/>`)}
 stroke(path=this.path){this.add(`<path d="${path}" transform="${this.matrix()}" fill="none" stroke="${this.paint(this.strokeStyle)}" stroke-width="${num(this.lineWidth)}" stroke-linecap="${esc(this.lineCap)}" stroke-linejoin="${esc(this.lineJoin)}"/>`)}
 fillRect(x,y,w,h){this.add(`<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" fill="${this.paint(this.fillStyle)}" transform="${this.matrix()}"/>`)}
 clip(path=this.path){const id=(this.definitionPrefix||'scene')+'clip'+ ++this.drawSerial;const d=String(path),matrix=this.matrix();this.defs.push(()=>`<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${d}" transform="${matrix}"/></clipPath>`);this.state.clips.push(id)}
 gradient(type,attrs){const gradient={id:(this.definitionPrefix||'scene')+'g'+ ++this.drawSerial,stops:[],addColorStop(offset,color){this.stops.push({offset,color})}};this.defs.push(()=>`<${type} id="${gradient.id}" gradientUnits="userSpaceOnUse" ${attrs}>${gradient.stops.map(s=>`<stop offset="${s.offset}" stop-color="${esc(s.color)}"/>`).join('')}</${type}>`);return gradient}
 createLinearGradient(x1,y1,x2,y2){return this.gradient('linearGradient',`x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}"`)}
 createRadialGradient(x0,y0,r0,x1,y1,r1){return this.gradient('radialGradient',`fx="${num(x0)}" fy="${num(y0)}" fr="${num(r0)}" cx="${num(x1)}" cy="${num(y1)}" r="${num(r1)}"`)}
 measureText(text){this.metrics.font=this.font;return this.metrics.measureText(text)}
 fillText(text,x,y,opacity=1){const match=this.font.match(/([\d.]+)px\s+(.+)/),size=match?match[1]:14,family=match?match[2]:'sans-serif';this.add(`<text x="${num(x)}" y="${num(y)}" font-family="${esc(family)}" font-size="${size}" fill="${this.paint(this.fillStyle)}" transform="${this.matrix()}" opacity="${num(opacity)}" xml:space="preserve">${esc(text)}</text>`)}
 symbol(key,draw){let cached=this.cache.get(key);if(!cached){const nodes=this.nodes,defs=this.defs,state=this.state,stack=this.stack;this.nodes=[];this.defs=[];this.state={...state,matrix:[1,0,0,1,0,0],clips:[]};this.stack=[];const id='flower'+ ++this.serial,oldPrefix=this.definitionPrefix,oldSerial=this.drawSerial;this.definitionPrefix=id;this.drawSerial=0;draw();this.definitionPrefix=oldPrefix;this.drawSerial=oldSerial;cached={id,nodes:this.nodes.join(''),defs:this.defs.map(d=>typeof d==='function'?d():d).join('')};this.cache.set(key,cached);if(this.cache.size>640)this.cache.delete(this.cache.keys().next().value);this.nodes=nodes;this.defs=defs;this.state=state;this.stack=stack}if(!this.usedSymbols.has(cached.id)){this.usedSymbols.add(cached.id);this.frameSymbols.push(cached)}this.add(`<use href="#${cached.id}" xlink:href="#${cached.id}" transform="${this.matrix()}"/>`)}
 content(){return '<defs>'+this.frameSymbols.map(s=>s.defs+`<g id="${s.id}">${s.nodes}</g>`).join('')+this.defs.map(d=>typeof d==='function'?d():d).join('')+'</defs>'+this.nodes.join('')}
 commit(){
  const doc=this.element.ownerDocument;if(!doc?.createElementNS){this.element.innerHTML=this.content();return}
  const ns='http://www.w3.org/2000/svg',decode=s=>s.replace(/&(amp|lt|gt|quot|apos);/g,(_,e)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[e]));
  const attrs=(node,source)=>{const found=new Set();for(const m of source.matchAll(/([\w:-]+)="([^"]*)"/g)){const key=m[1],value=decode(m[2]);found.add(key);if(node.getAttribute(key)!==value){if(key==='xlink:href')node.setAttributeNS('http://www.w3.org/1999/xlink',key,value);else if(key==='xml:space')node.setAttributeNS('http://www.w3.org/XML/1998/namespace',key,value);else node.setAttribute(key,value)}}for(const attr of [...node.attributes])if(!found.has(attr.name))node.removeAttribute(attr.name)};
  const patch=(existing,markup)=>{let opening=markup.match(/^<([\w:-]+)\b([^>]*?)(\/?)>/);if(!opening)return existing;let node=existing;if(!node||node.localName!==opening[1])node=doc.createElementNS(ns,opening[1]);attrs(node,opening[2]);if(opening[1]==='text'){let value=decode(markup.slice(opening[0].length,markup.lastIndexOf('</text>')));if(node.textContent!==value)node.textContent=value}else if(opening[1]==='g'||opening[1]==='clipPath'){const inner=markup.slice(opening[0].length,markup.lastIndexOf('</')),oldChild=node.children[0],child=patch(oldChild,inner);if(!oldChild)node.appendChild(child);else if(child!==oldChild)oldChild.replaceWith(child);while(node.children.length>1)node.lastChild.remove()}else if(opening[1]==='linearGradient'||opening[1]==='radialGradient'){let stops=[...markup.matchAll(/<stop\b([^>]*?)\/>/g)];for(let i=0;i<stops.length;i++){let stop=node.children[i];if(!stop){stop=doc.createElementNS(ns,'stop');node.appendChild(stop)}attrs(stop,stops[i][1])}while(node.children.length>stops.length)node.lastChild.remove()}return node};
  if(!this.live){const defs=doc.createElementNS(ns,'defs'),group=doc.createElementNS(ns,'g');const symbols=doc.createElementNS(ns,'defs');this.element.replaceChildren(symbols,defs,group);this.live={symbols,symbolNodes:new Map(),defs,group,definitions:[],items:[]}}
  // Definitions stay mounted when a new leaf or whorl enters the scene.
  for(const symbol of this.frameSymbols){
    if(this.live.symbolNodes.has(symbol.id))continue;
    const node=doc.createElementNS(ns,'g');
    node.innerHTML=symbol.defs+`<g id="${symbol.id}">${symbol.nodes}</g>`;
    this.live.symbols.appendChild(node);
    this.live.symbolNodes.set(symbol.id,node);
  }
  if(this.live.symbolNodes.size>640){
    for(const [id,node] of this.live.symbolNodes){
      if(!this.usedSymbols.has(id)){node.remove();this.live.symbolNodes.delete(id)}
    }
  }
  const update=(host,records,entries)=>{for(let i=0;i<entries.length;i++){let entry=entries[i],record=records[i];if(record?.html===entry.html)continue;let node;if(entry.simple)node=patch(record?.simple?record.node:null,entry.html);else{node=record&&!record.simple?record.node:doc.createElementNS(ns,'g');node.innerHTML=entry.html}if(!record)host.appendChild(node);else if(record.node!==node)record.node.replaceWith(node);records[i]={node,html:entry.html,simple:entry.simple}}while(records.length>entries.length)records.pop().node.remove()};
  update(this.live.defs,this.live.definitions,this.defs.map(d=>({html:typeof d==='function'?d():d,simple:typeof d==='function'})));update(this.live.group,this.live.items,this.nodes.map(html=>({html,simple:true})));
 }
 toSVG(extra=''){return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1600" height="${this.height||1000}" viewBox="0 0 1600 ${this.height||1000}" role="img">${extra}${this.content()}</svg>`}
}
for(const key of ['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','font','textBaseline'])Object.defineProperty(SVGScene.prototype,key,{get(){return this.state[key]},set(v){this.state[key]=v}});
if(typeof module!=='undefined'&&module.exports)module.exports={SVGScene,SVGPath};else Object.assign(root,{SVGScene,SVGPath});
})(typeof globalThis!=='undefined'?globalThis:this);
