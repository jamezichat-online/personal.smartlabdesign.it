import {useMemo,useRef,useState} from 'react';
import type {Project,Slide} from './studio-engine';
import {cardDefaults,cardLayout} from './tribe-template';
type Key='category'|'title'|'subtitle';
const labels:Record<Key,string>={category:'Categoria',title:'Titolo',subtitle:'Sottotitolo'};
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const round=(v:number)=>Math.round(v*10)/10;
type Drag={key:Key;mode:'move'|'resize';x:number;y:number;rect:DOMRect;px:number;py:number;boxW:number;size:number;spacing:number;widthPct:number};
/* Livello di controllo sopra il canvas: trascina per spostare, maniglia in basso a destra per ridimensionare. */
export default function CardOverlay({p,s,w,h,tick,onPatch}:{p:Project;s:Slide;w:number;h:number;tick:number;onPatch:(patch:Record<string,any>)=>void}){
const [sel,setSel]=useState<Key|null>(null);const wrap=useRef<HTMLDivElement>(null),drag=useRef<Drag|null>(null),ctx=useRef<CanvasRenderingContext2D|null>(null);
if(!ctx.current)ctx.current=document.createElement('canvas').getContext('2d');
const q={...cardDefaults(p.tribe),...p.card};
const layout=useMemo(()=>ctx.current?cardLayout(ctx.current,p,s,w,h):null,[p,s,w,h,tick]);
if(!layout)return null;
const scale=w/1080;
function patchFor(key:Key,factor:number,d:{size:number;spacing:number;widthPct:number}){const f=clamp(factor,.2,6);
if(key==='title')return{titleSize:round(clamp(d.size*f,20,350)),titleSpacing:round(clamp(d.spacing*f,-10,30))};
if(key==='category')return{categorySize:round(clamp(d.size*f,10,100)),categorySpacing:round(clamp(d.spacing*f,-2,30))};
return{subtitleSize:round(clamp(d.size*f,12,140)),subtitleWidth:round(clamp(d.widthPct*f,10,95))}}
function start(e:React.PointerEvent<HTMLElement>,key:Key,mode:'move'|'resize'){const rect=wrap.current?.getBoundingClientRect();if(!rect||!rect.width)return;e.preventDefault();e.stopPropagation();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);setSel(key);const box=layout![key] as any;
drag.current={key,mode,x:e.clientX,y:e.clientY,rect,px:q[key+'X'],py:q[key+'Y'],boxW:box.w,size:box.size/scale,spacing:key==='title'?q.titleSpacing:key==='category'?q.categorySpacing:0,widthPct:q.subtitleWidth}}
function move(e:React.PointerEvent<HTMLElement>){const d=drag.current;if(!d)return;const dx=(e.clientX-d.x)/d.rect.width,dy=(e.clientY-d.y)/d.rect.height;
if(d.mode==='move'){onPatch({[d.key+'X']:round(clamp(d.px+dx*100,0,90)),[d.key+'Y']:round(clamp(d.py+dy*100,0,95))});return}
const newW=Math.max(20*scale,d.boxW+dx*w);onPatch(patchFor(d.key,newW/d.boxW,d))}
function end(e:React.PointerEvent<HTMLElement>){if(drag.current&&(e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId))(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);drag.current=null}
function keys(e:React.KeyboardEvent<HTMLElement>,key:Key){const step=e.shiftKey?2:.5;const box=layout![key] as any;let patch:Record<string,any>|null=null;
if(e.key==='ArrowLeft')patch={[key+'X']:round(clamp(q[key+'X']-step,0,90))};else if(e.key==='ArrowRight')patch={[key+'X']:round(clamp(q[key+'X']+step,0,90))};else if(e.key==='ArrowUp')patch={[key+'Y']:round(clamp(q[key+'Y']-step,0,95))};else if(e.key==='ArrowDown')patch={[key+'Y']:round(clamp(q[key+'Y']+step,0,95))};
else if(e.key==='+'||e.key==='=')patch=patchFor(key,1.04,{size:box.size/scale,spacing:key==='title'?q.titleSpacing:key==='category'?q.categorySpacing:0,widthPct:q.subtitleWidth});else if(e.key==='-'||e.key==='_')patch=patchFor(key,.96,{size:box.size/scale,spacing:key==='title'?q.titleSpacing:key==='category'?q.categorySpacing:0,widthPct:q.subtitleWidth});
else if(e.key==='Escape'){setSel(null);return}
if(patch){e.preventDefault();onPatch(patch)}}
return <div ref={wrap} className="card-overlay" onPointerDown={e=>{if(e.target===e.currentTarget)setSel(null)}}>
{(['category','title','subtitle'] as Key[]).map(key=>{const b=layout[key];const pad=6*scale;return <div key={key} role="button" tabIndex={0} aria-label={`${labels[key]}: trascina per spostare, frecce per spostare, più e meno per ridimensionare`} className={'card-box'+(sel===key?' selected':'')+(key==='title'&&layout.title.fitted?' fitted':'')} style={{left:`${(b.x-pad)/w*100}%`,top:`${(b.y-pad)/h*100}%`,width:`${(b.w+pad*2)/w*100}%`,height:`${(b.h+pad*2)/h*100}%`}} onPointerDown={e=>start(e,key,'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onFocus={()=>setSel(key)} onKeyDown={e=>keys(e,key)}>
<span className="card-tag">{labels[key]}{key==='title'&&layout.title.fitted?' · adattato':''}</span>
<i className="card-handle" aria-hidden="true" onPointerDown={e=>start(e,key,'resize')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}/>
</div>})}
</div>}
