import * as THREE from './vendor/three.module.js';
import { createGlassCompositor } from './glass.js?v=15';
import { createDepthOfField } from './depth-of-field.js?v=14';
const $=s=>document.querySelector(s),canvas=$('#view'),stage=$('#stage');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const W=314,H=440,PAD=48,w=3.14,h=4.40;
const studioLight={value:1},cinema={value:1};
const railMaterials=[],antennaTint={value:new THREE.Color(0x92999e)};
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){$('#loading').textContent='WebGL non disponibile. Abilita l’accelerazione grafica nel browser.';throw e;}
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.5),matchMedia('(pointer: coarse)').matches?2:3));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(0,0,12);
const root=new THREE.Group(),device=new THREE.Group();scene.add(root);root.add(device);
// Physical illumination: large softboxes reflected in the polished metal.
const studio=new THREE.Scene();studio.background=new THREE.Color('#252b32');
function softbox(x,y,z,sx,sy,intensity){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity*.98,intensity*.95),side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.lookAt(0,0,0);studio.add(mesh);}
softbox(-5,6,7,4,5,7);softbox(5,0,2,1.3,7,5);softbox(0,6,-2,6,2,8);softbox(0,-4,3,5,1,2);softbox(-3,1,-5,2,6,4);
const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(studio,.025,.1,100,{size:1024});scene.environment=env.texture;
// A separate photographic reflection rig: broad key, narrow edge strips,
// negative fill and graded emitters rather than uniformly bright white cards.
const filmStudio=new THREE.Scene();filmStudio.background=new THREE.Color(.006,.008,.012);
function filmSoftbox(position,size,energy,tint){
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,uniforms:{energy:{value:energy},tint:{value:new THREE.Color(tint)}},
 vertexShader:'varying vec2 cardUv;void main(){cardUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 cardUv;uniform float energy;uniform vec3 tint;void main(){vec2 q=abs(cardUv*2.-1.);float edge=(1.-smoothstep(.66,1.,q.x))*(1.-smoothstep(.74,1.,q.y));float falloff=mix(.62,1.,1.-cardUv.y);gl_FragColor=vec4(tint*energy*edge*falloff,1.);}`});
 const card=new THREE.Mesh(new THREE.PlaneGeometry(...size),material);card.position.set(...position);card.lookAt(0,0,0);filmStudio.add(card);
}
filmSoftbox([-5,6,7],[5,6],8.5,0xfff6ea);
filmSoftbox([4.5,1,3],[.85,7],5.0,0xe9f0ff);
filmSoftbox([1,5,-5],[5,1.5],10.0,0xeaf1ff);
filmSoftbox([-4,-2,-4],[1.2,5],3.8,0xffffff);
filmSoftbox([0,-5,4],[5,2],.65,0xffffff);
const filmEnv=pmrem.fromScene(filmStudio,.035,.1,100,{size:1024});pmrem.dispose();
// World-space studio key: the same position as the reflected main softbox.
const ambient=new THREE.HemisphereLight(0xeaf2ff,0x454039,.55);scene.add(ambient);
const key=new THREE.SpotLight(0xfff5e8,115,40,Math.PI*.30,.8,2);
key.position.set(-5,6,7);key.target.position.set(0,-.4,0);scene.add(key,key.target);
key.castShadow=true;key.shadow.mapSize.set(4096,4096);
key.shadow.camera.near=.5;key.shadow.camera.far=30;
key.shadow.bias=-.00008;key.shadow.normalBias=.0025;key.shadow.radius=4;
const fill=new THREE.DirectionalLight(0xd9e7ff,.75);fill.position.set(5,1,3);scene.add(fill);
const rimLight=new THREE.DirectionalLight(0xffffff,1.6);rimLight.position.set(1,5,-5);scene.add(rimLight);
const titanium=new THREE.MeshPhysicalMaterial({color:0xaaaead,metalness:1,roughness:.19,clearcoat:.18,clearcoatRoughness:.18,envMapIntensity:1.5});
const graphite=new THREE.MeshStandardMaterial({color:0x111315,metalness:.35,roughness:.3});
const black=new THREE.MeshStandardMaterial({color:0x020303,metalness:.1,roughness:.26});
// Superelliptic corner profile with a wider footprint and tangential transitions.
function shape(x0,x1,y0,y1,rl,rr){
 const path=new THREE.Shape(),maxR=Math.min((x1-x0)/2,(y1-y0)/2);
 rl=Math.min(rl,maxR);rr=Math.min(rr,maxR);
 const power=2/2.25,sg=v=>Math.sign(v)*Math.pow(Math.abs(v),power);
 const arcs=[[x1-rr,y0+rr,rr,-Math.PI/2],[x1-rr,y1-rr,rr,0],[x0+rl,y1-rl,rl,Math.PI/2],[x0+rl,y0+rl,rl,Math.PI]];
 for(let j=0;j<4;j++){const [cx,cy,r,start]=arcs[j];for(let i=0;i<=48;i++){const a=start+i/48*Math.PI/2,x=cx+r*sg(Math.cos(a)),y=cy+r*sg(Math.sin(a));if(j===0&&i===0)path.moveTo(x,y);else path.lineTo(x,y);}}
 path.closePath();return path;
}
const left=new THREE.Group(),right=new THREE.Group();device.add(left,right);
// Average coincident vertex normals without altering UVs or material groups.
function polishedNormals(geo){
 const pos=geo.attributes.position,n=geo.attributes.normal,buckets=new Map();
 for(let i=0;i<pos.count;i++){const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>Math.round(v*1e6)).join(',');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);}
 for(const ids of buckets.values()){const normal=new THREE.Vector3();for(const i of ids)normal.add(new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)));normal.normalize();for(const i of ids)n.setXYZ(i,normal.x,normal.y,normal.z);}
 n.needsUpdate=true;return geo;
}
const satinGlass=new THREE.MeshPhysicalMaterial({color:0xeeeae3,metalness:0,roughness:.43,ior:1.46,clearcoat:.35,clearcoatRoughness:.32,envMapIntensity:.65});
const ceramic=new THREE.MeshPhysicalMaterial({color:0xe5e3dc,metalness:0,roughness:.3,clearcoat:.6,clearcoatRoughness:.2});
const finishes={
 titanium:{metal:0xaaaead,glass:0xeeeae3,roughness:.19,glassRoughness:.43},
 midnight:{metal:0x071426,glass:0x0d1b2d,roughness:.16,glassRoughness:.38}
};
function setFinish(name){
 const finish=finishes[name]||finishes.titanium;
 antennaTint.value.setHex(name==='midnight'?0x273340:0x92999e);
 titanium.color.setHex(finish.metal);titanium.roughness=finish.roughness;titanium.needsUpdate=true;
 railMaterials.forEach(m=>{m.color.copy(titanium.color);m.roughness=titanium.roughness;});
 satinGlass.color.setHex(finish.glass);satinGlass.roughness=finish.glassRoughness;satinGlass.needsUpdate=true;
 document.querySelectorAll('.finish').forEach(button=>{const active=button.dataset.finish===name;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active)});
}
function solid(outline,depth,bevel,material){const geo=new THREE.ExtrudeGeometry(outline,{depth,bevelEnabled:true,bevelSegments:20,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:128});return new THREE.Mesh(polishedNormals(geo),material);}
function shell(parent,x0,x1,rl,rr){
 const body=solid(shape(x0,x1,-h/2,h/2,rl,rr),.105,.035,railMaterial(parent===left));body.position.z=-.11;
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 depth.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 railPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nrailPoint=position+vec3(0.,0.,-.11);');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 railPoint;float capsule(vec2 p,vec2 halfSize){vec2 q=abs(p)-halfSize+halfSize.y;return length(max(q,0.))+min(max(q.x,q.y),0.)-halfSize.y;}').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+railCut(parent===left));
 };
 depth.customProgramCacheKey=()=>parent===left?'rail-shadow-left':'rail-shadow-right';body.customDepthMaterial=depth;parent.add(body);
 const border=shape(x0+.025,x1-.025,-h/2+.025,h/2-.025,Math.max(.005,rl-.025),Math.max(.005,rr-.025));
 const bezel=new THREE.Mesh(new THREE.ShapeGeometry(border,128),graphite);bezel.position.z=.042;parent.add(bezel);
 // Only the fixed half has a frosted rear panel. The moving half carries the cover display.
 if(parent===right){const inset=.045;
  const rear=solid(shape(x0+inset,x1-inset,-h/2+inset,h/2-inset,.012,.415),.018,.012,satinGlass);
  rear.position.z=-.159;parent.add(rear);
 }
 return body;
}
shell(right,0,w,.035,.46);shell(left,-w,0,.46,.035);
// Enclosed hinge spine with rounded profile, machined end blocks and two joints.
const hingeGroup=new THREE.Group();device.add(hingeGroup);
const spine=solid(shape(-.085,.085,-h/2+.035,h/2-.035,.07,.07),.105,.025,titanium);spine.position.z=-.135;hingeGroup.add(spine);
for(const y of [-h/2+.075,h/2-.075]){
 const cap=solid(shape(-.078,.078,y-.047,y+.047,.022,.022),.105,.014,titanium);cap.position.z=-.135;hingeGroup.add(cap);
 const jointY=y+(y>0?-.060:.060);
 const joint=solid(shape(-.08,.08,jointY-.003,jointY+.003,.002,.002),.10,.003,graphite);joint.position.z=-.133;hingeGroup.add(joint);
}
function rearDisc(parent,x,y,z,r,depth,material){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,192,1),material);m.userData.optic=true;m.rotation.x=Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}
// Lofted frosted-glass island: broad tangent foot, concave shoulder, flat crown.
// The profile is reconstructed from the supplied edge-on view, not an extrusion.
function cameraIsland(){
 const count=256,layers=32,positions=[],indices=[];
 for(let j=0;j<=layers;j++){
  const t=j/layers,e=Math.sin(t*Math.PI/2);
  const x0=.65+.12*e,x1=3.005-.09*e,y0=1.075+.065*e,y1=2.05-.065*e;
  const contour=shape(x0,x1,y0,y1,(y1-y0)*.5,(y1-y0)*.5).getSpacedPoints(count);
  for(let i=0;i<count;i++)positions.push(contour[i].x,contour[i].y,-.17-.115*t);
 }
 for(let j=0;j<layers;j++)for(let i=0;i<count;i++){
  const a=j*count+i,b=j*count+(i+1)%count,c=a+count,d=b+count;
  indices.push(a,c,b,b,c,d);
 }
 const center=positions.length/3;positions.push((.78+2.915)/2,(1.14+1.985)/2,-.285);
 for(let i=0;i<count;i++)indices.push(center,layers*count+(i+1)%count,layers*count+i);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 return new THREE.Mesh(g,satinGlass);
}
right.add(cameraIsland());
const optical=new THREE.MeshPhysicalMaterial({color:0x11151e,metalness:.12,roughness:.08,clearcoat:1,clearcoatRoughness:.025,ior:1.52});
const coating=new THREE.MeshPhysicalMaterial({color:0x16313d,metalness:.45,roughness:.10,clearcoat:1,iridescence:.24,iridescenceIOR:1.35});
// Flat protective glass has an analytic normal; convex optical elements sit below it.
const lensGlass=new THREE.MeshPhysicalMaterial({color:0xcad9ed,metalness:0,roughness:.035,transparent:true,opacity:.16,depthWrite:false,ior:1.52,clearcoat:1,clearcoatRoughness:.025,envMapIntensity:.65});
function opticalDome(x,y,z,r,depth,material){const dome=new THREE.Mesh(new THREE.SphereGeometry(r,96,64),material);dome.scale.z=depth/r;dome.position.set(x,y,z);dome.userData.optic=true;right.add(dome);return dome;}
for(const x of [1.65,2.46]){
 // Bezel stands proud of the island; glass sits below its machined outer lip.
 rearDisc(right,x,1.57,-.322,.345,.088,titanium);
 rearDisc(right,x,1.57,-.355,.307,.015,graphite);
 const well=rearDisc(right,x,1.57,-.361,.288,.008,new THREE.MeshStandardMaterial({color:0x07080c,roughness:.55}));well.userData.optic=true;
 opticalDome(x,1.57,-.361,.205,.011,optical);
 opticalDome(x,1.57,-.368,.096,.008,coating);
 opticalDome(x,1.57,-.374,.041,.003,new THREE.MeshPhysicalMaterial({color:0x070b18,roughness:.09,clearcoat:.6}));
 const glass=new THREE.Mesh(new THREE.CircleGeometry(.287,192),lensGlass);
 glass.rotation.y=Math.PI;glass.position.set(x,1.57,-.390);glass.userData.optic=true;right.add(glass);
 // Continuous open sleeve and annular seating connect the protective glass to the barrel.
 const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.333,.333,.048,192,1,true),titanium);sleeve.rotation.x=Math.PI/2;sleeve.position.set(x,1.57,-.377);sleeve.userData.optic=true;right.add(sleeve);
 const seat=new THREE.Mesh(new THREE.RingGeometry(.282,.334,192),titanium);seat.rotation.y=Math.PI;seat.position.set(x,1.57,-.393);seat.userData.optic=true;right.add(seat);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.322,.012,32,192),titanium);rim.position.set(x,1.57,-.395);rim.userData.optic=true;right.add(rim);
}
rearDisc(right,1.05,1.37,-.292,.068,.012,new THREE.MeshPhysicalMaterial({color:0xfff4df,roughness:.23,clearcoat:1}));
rearDisc(right,1.05,1.37,-.301,.043,.007,new THREE.MeshStandardMaterial({color:0xd9ceac,roughness:.42}));
const mic=solid(shape(1.00,1.10,1.69,1.73,.018,.018),.004,.003,graphite);mic.position.z=-.294;right.add(mic);
// Two flush side keys separated as in the closed-device views.
for(const [y,len] of [[.99,.66],[-.73,.64]]){
 const seat=solid(shape(-.044,.044,-len/2-.015,len/2+.015,.035,.035),.005,.005,graphite);seat.rotation.y=Math.PI/2;seat.position.set(w+.035,y,-.045);right.add(seat);
 const button=solid(shape(-.034,.034,-len/2,len/2,.03,.03),.014,.007,titanium);button.rotation.y=Math.PI/2;button.position.set(w+.042,y,-.045);right.add(button);
}
// The upper rail has the two adjacent pill-shaped keys visible in the profile.
for(const x of [1.72,2.27]){
 const key=solid(shape(-.215,.215,-.035,.035,.034,.034),.014,.007,titanium);
 key.rotation.x=-Math.PI/2;key.position.set(x,h/2+.038,-.047);right.add(key);
}
// Antennas are dielectric regions of the rail itself: no overlapping geometry.
// Openings remove the rail surface and expose recessed socket walls.
function railCut(isLeft){
 const holes=isLeft?Array.from({length:6},(_,i)=>[-2.48+i*.125,.027,.027]):[[.91,.255,.048],...Array.from({length:5},(_,i)=>[2.10+i*.125,.027,.027])];
 return holes.map(([x,rx,rz])=>`if(railPoint.y < -2.17 && capsule(railPoint.xz-vec2(${x.toFixed(5)},-.052),vec2(${rx.toFixed(5)},${rz.toFixed(5)})) < 0.) discard;`).join('\n');
}
function railMaterial(isLeft){
 const material=titanium.clone();railMaterials.push(material);
 material.onBeforeCompile=shader=>{
  shader.uniforms.antennaTint=antennaTint;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 railPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nrailPoint=position+vec3(0.,0.,-.11);');
  const cut=railCut(isLeft);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 railPoint;uniform vec3 antennaTint;
 float capsule(vec2 p,vec2 halfSize){vec2 q=abs(p)-halfSize+halfSize.y;return length(max(q,0.))+min(max(q.x,q.y),0.)-halfSize.y;}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 ${cut}
 float railEdge=step(2.10,abs(railPoint.y));
 float sideEdge=step(3.125,abs(railPoint.x));
 float antenna=max(railEdge*max(1.-smoothstep(.020,.022,abs(abs(railPoint.x)-.31)),1.-smoothstep(.020,.022,abs(abs(railPoint.x)-2.78))),sideEdge*(1.-smoothstep(.024,.026,abs(abs(railPoint.y)-1.59))));
 antenna*=step(-.146,railPoint.z)*step(railPoint.z,.031);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,antennaTint,antenna);').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.55,antenna);').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,0.,antenna);');
 };
 material.customProgramCacheKey=()=>isLeft?'rail-left-v11':'rail-right-v11';return material;
}
const undersideY=-h/2-.035;
function socket(parent,x,width,height){
 const outline=new THREE.Shape(),radius=height/2,offset=width/2-radius;
 outline.absarc(offset,0,radius,-Math.PI/2,Math.PI/2,false);outline.absarc(-offset,0,radius,Math.PI/2,Math.PI*1.5,false);outline.closePath();
 const contour=outline.getPoints(),pos=[],indices=[];
 // Mouth on the rail tangent, interior 0.065 units into the device.
 for(const depth of [0,.065])for(const p of contour)pos.push(p.x,p.y,depth);
 const n=contour.length;
 for(let i=0;i<n-1;i++)indices.push(i,i+n,i+1,i+1,i+n,i+n+1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();
 const group=new THREE.Group();group.rotation.x=-Math.PI/2;group.position.set(x,undersideY,-.052);parent.add(group);
 const wall=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x41464c,metalness:.85,roughness:.32,side:THREE.DoubleSide}));group.add(wall);
 const back=new THREE.Mesh(new THREE.ShapeGeometry(outline),black);back.material=black.clone();back.material.side=THREE.DoubleSide;back.position.z=.064;group.add(back);
 return group;
}
const usb=socket(right,.91,.51,.096);
// Recessed tongue and two rows of discrete contacts, wholly inside the mouth.
const tongue=solid(shape(-.181,.181,-.012,.012,.011,.011),.022,.002,graphite);tongue.position.z=.026;usb.add(tongue);
const contactMaterial=new THREE.MeshStandardMaterial({color:0xb1a17e,metalness:.85,roughness:.3});
for(let i=0;i<12;i++)for(const row of [-1,1]){const contact=new THREE.Mesh(new THREE.BoxGeometry(.014,.002,.017),contactMaterial);contact.position.set(-.148+i*.027,row*.014,.030);usb.add(contact);}
for(let i=0;i<6;i++)socket(left,-2.48+i*.125,.054,.054);
for(let i=0;i<5;i++)socket(right,2.10+i*.125,.054,.054);
for(const [parent,x] of [[left,-.48],[right,.48],[right,1.40]]){
 const disc=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,.002,64),titanium);disc.position.set(x,undersideY-.0005,-.052);parent.add(disc);
 for(let i=0;i<5;i++){const slot=new THREE.Mesh(new THREE.BoxGeometry(.005,.001,.016),black);slot.rotation.y=i*Math.PI*2/5;slot.position.set(x,undersideY-.002,-.052);parent.add(slot);}
}
// Two predefined compositions; aperture projection compensates the hinge only.
// Orbit rotation remains a true perspective projection of the complete object.
const uniforms=[];
const vert=`varying vec3 vDevice; varying vec2 vLocal; varying vec3 worldPoint; varying vec3 worldNormal; uniform mat4 deviceInverse; void main(){worldPoint=(modelMatrix*vec4(position,1.)).xyz;worldNormal=normalize(mat3(modelMatrix)*normal);vLocal=position.xy;vDevice=(deviceInverse*vec4(worldPoint,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const frag=`precision highp float;
 varying vec3 vDevice;varying vec2 vLocal;varying vec3 worldPoint;varying vec3 worldNormal;
 uniform vec3 cameraInDevice;uniform float lightLevel;uniform sampler2D picture;uniform sampler2D blurred;uniform float opening;uniform float face;uniform float bound;uniform float visibleFace;
 float rounded(vec2 p,vec2 size,float r){vec2 q=abs(p)-size+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
 void main(){
 if(visibleFace<.5)discard;
 float W=3.14,H=4.40;
 // Reproject each surface fragment onto the fixed half's display plane.
 // Camera and fragment share device coordinates, preserving global orbit perspective.
 vec3 ray=vDevice-cameraInDevice;
 float denominator=abs(ray.z)>.0001?ray.z:(ray.z<0.?-.0001:.0001);
 float planeT=(.045-cameraInDevice.z)/denominator;
 vec2 q=(cameraInDevice+ray*planeT).xy;
 bool moving=face>.5;
 // Once folded away, the separate cover display resumes its physical local mapping.
 if(face>1.5)q=mix(q,vec2(-vLocal.x,vLocal.y),smoothstep(.52,.68,opening));
 float leftEdge=face>1.5?0.:-W;
 float rightEdge=W;
 float rad=.395;
 float center=(leftEdge+rightEdge)*.5;
 // Closed composition has square hinge-side corners, rounded free-edge corners.
 if(face>1.5&&q.x<center)rad=0.;
 float dist=rounded(q-vec2(center,0.),vec2((rightEdge-leftEdge)*.5,H*.5-.065),min(rad,max(.001,(rightEdge-leftEdge)*.45)));
 float aa=max(fwidth(dist),.001);float aperture=1.-smoothstep(-aa,aa,dist);
 vec2 uv=face>1.5?vec2(q.x/W,q.y/H+.5):vec2(q.x/(2.*W)+.5,q.y/H+.5);
 if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)aperture=0.;
 float grazing=pow(max(0.,sin(opening*3.14159265)),.82);
 float fold=clamp(1.-opening,0.,1.);
 float creaseWidth=mix(.025,.28,smoothstep(0.,.92,fold));
 float crease=face<1.5?exp(-pow(abs(q.x)/max(creaseWidth,.001),2.))*pow(fold,.62):0.;
 float freeEdge=abs(vLocal.x)/W;
 float side=smoothstep(.38,1.,freeEdge);
 float feather=moving?smoothstep(-.11*grazing-.005,-.001,dist):0.;
 float blurAmount=moving?clamp(grazing*side*1.2+feather*.5+crease*.24,0.,1.):crease*.12;
 vec4 sharp=texture2D(picture,clamp(uv,0.,1.));
 vec4 soft=texture2D(blurred,clamp(uv,0.,1.));
 vec3 col=mix(sharp.rgb,soft.rgb,blurAmount);
 float shadow=moving?(.97*grazing*pow(side,.72)):0.;
 if(face<.5)shadow=.96*(1.-smoothstep(0.,.5,opening));
 col*=1.-shadow;
 // Optical fold valley: it narrows and disappears continuously at full opening.
 col*=1.-crease*.42;
 // Broad low-energy specular lobe for the matte display coating.
 // BackSide rendering reverses GL winding; use the physical cover normal explicitly.
 vec3 N=normalize(worldNormal)*(face>1.5?-1.:1.);
 vec3 V=normalize(cameraPosition-worldPoint),L=normalize(vec3(-5.,6.,7.)-worldPoint);
 vec3 halfway=normalize(V+L);float fresnel=.04+.16*pow(1.-max(dot(N,V),0.),5.);
 float reflection=0.,fillReflection=0.;
 // Integrate a broad softbox lobe over its extent for a diffuse matte reflection.
 for(int ix=-1;ix<=1;ix++)for(int iy=-1;iy<=1;iy++){
 vec3 areaL=normalize(vec3(-5.+float(ix)*1.3,6.+float(iy)*1.5,7.)-worldPoint);
 reflection+=pow(max(dot(N,normalize(V+areaL)),0.),16.)*max(dot(N,areaL),0.)/9.;
 vec3 fillL=normalize(vec3(4.5+float(ix)*.4,1.+float(iy)*1.7,3.)-worldPoint);
 fillReflection+=pow(max(dot(N,normalize(V+fillL)),0.),12.)*max(dot(N,fillL),0.)/9.;
 }
 float coverGain=face>1.5?1.45:1.;
 vec3 coatingReflection=vec3(1.,.97,.93)*reflection*6.+vec3(.90,.95,1.)*fillReflection*2.;
 col+=lightLevel*coverGain*coatingReflection*fresnel*(face>1.5?1.:(.35+.65*(1.-shadow)));
 col*=1.+.10*(1.-smoothstep(0.,.35,lightLevel));
 col*=aperture*(1.-feather*.95);
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
function screen(parent,x0,x1,z,face,back=false,rl=x0<0?.395:.003,rr=x0<0?.003:.395){const geo=new THREE.ShapeGeometry(shape(x0,x1,-h/2+.065,h/2-.065,rl,rr),128);
 const u={lightLevel:studioLight,picture:{value:null},blurred:{value:null},opening:{value:.7},face:{value:face},bound:{value:-w},deviceInverse:{value:new THREE.Matrix4()},cameraInDevice:{value:new THREE.Vector3()},visibleFace:{value:1}};uniforms.push(u);
 const mat=new THREE.ShaderMaterial({uniforms:u,vertexShader:vert,fragmentShader:frag,side:back?THREE.BackSide:THREE.FrontSide,toneMapped:false});
 const mesh=new THREE.Mesh(geo,mat);mesh.position.z=z;parent.add(mesh);return mesh;}
// Both inner sheets meet beneath the fold line. At 180° the shared texture is
// visually continuous; during motion only the shader crease describes the bend.
const insideRight=screen(right,-.008,w-.065,.045,0,false,.001,.395);
const insideLeft=screen(left,-w+.065,.008,.045,1,false,.395,.001);
const outsideLeft=screen(left,-w+.065,-.015,-.15,2,true);
// Circular cover camera in the latest supplied closed-device reference.
rearDisc(left,-w+.265,h/2-.29,-.164,.091,.012,black);
rearDisc(left,-w+.265,h/2-.29,-.173,.027,.007,optical);
// Hardware casts and receives dynamic shadows; transmissive lens covers do not
// turn into opaque black occluders. The display keeps its authored reveal shader.
device.traverse(object=>{if(object.isMesh){const glass=object.material.transmission>0;object.castShadow=!glass&&!object.userData.optic;object.receiveShadow=!object.material.isShaderMaterial&&!object.userData.optic;}});
let p=.7,target=.7,tween=null,slow=false,floating=!reduced,loaded=false;
let orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.1,-.28,0));root.quaternion.copy(orientation);
const rotationVelocity=new THREE.Vector2(),pan=new THREE.Vector2();let zoom=12;
function progress(value){p=clamp(value);$('#fold').value=Math.round(p*1000);$('#percent').textContent=Math.round(p*100)+'%';$('#angle').textContent=Math.round(p*180)+'°';$('#toggle').textContent=p>.5?'Chiudi dispositivo ↙':'Apri dispositivo ↗';}
function animate(targetValue){target=targetValue;tween={from:p,to:target,start:performance.now(),duration:reduced?1:(slow?16000:4000)*Math.max(.12,Math.abs(target-p))};}
$('#toggle').onclick=()=>animate(p>.5?0:1);$('#fold').oninput=e=>{tween=null;target=+e.target.value/1000;if(reduced)progress(target)};
$('#slow').onclick=e=>{slow=!slow;e.currentTarget.setAttribute('aria-pressed',slow)};$('#float').onclick=e=>{floating=!floating;e.currentTarget.setAttribute('aria-pressed',floating)};
$('#reset').onclick=()=>{orientation.identity();rotationVelocity.set(0,0);pan.set(0,0);zoom=12;};
const pointers=new Map();let lastPinch=null;
canvas.oncontextmenu=e=>e.preventDefault();
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button});rotationVelocity.set(0,0);lastPinch=null;};
canvas.onpointermove=e=>{const prev=pointers.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:prev.button});
 if(pointers.size===2){const pts=[...pointers.values()],distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(lastPinch)zoom=clamp(zoom*lastPinch/distance,5,24);lastPinch=distance;pan.x+=dx*.002;pan.y-=dy*.002;return;}
 if(prev.button===2||e.shiftKey){pan.x+=dx*.004;pan.y-=dy*.004;return;}
 const a=new THREE.Quaternion().setFromEuler(new THREE.Euler(dy*.006,dx*.006,0,'XYZ'));orientation.premultiply(a);rotationVelocity.set(dy*.006,dx*.006);};
function release(e){pointers.delete(e.pointerId);lastPinch=null;}canvas.onpointerup=release;canvas.onpointercancel=release;canvas.onlostpointercapture=release;
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(e.deltaY*.001),5,24)},{passive:false});
canvas.onkeydown=e=>{let x=0,y=0;if(e.key==='ArrowUp')x=-.1;if(e.key==='ArrowDown')x=.1;if(e.key==='ArrowLeft')y=-.1;if(e.key==='ArrowRight')y=.1;if(x||y){e.preventDefault();orientation.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,0)));}if(e.key==='+'||e.key==='=')zoom=clamp(zoom-.5,5,24);if(e.key==='-')zoom=clamp(zoom+.5,5,24);};
// Continuous separable Gaussian bloom, not displaced copies of the sharp image.
const hdr=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
const dof=createDepthOfField(renderer,hdr,camera,[insideRight,insideLeft,outsideLeft]);
const bloomA=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
const bloomB=bloomA.clone();
const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const postVertex='varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.,1.);}';
const extractMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:dof.target.texture},lightLevel:studioLight},vertexShader:postVertex,fragmentShader:`varying vec2 uvScreen;uniform sampler2D source;uniform float lightLevel;void main(){vec4 c=texture2D(source,uvScreen);float l=max(c.r,max(c.g,c.b));float studio=smoothstep(0.,.5,lightLevel);float emission=smoothstep(mix(.35,1.8,studio),mix(.95,4.,studio),l);gl_FragColor=vec4(min(c.rgb,vec3(12.))*emission*c.a,1.);}`});
const blurMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:bloomA.texture},direction:{value:new THREE.Vector2()}},vertexShader:postVertex,fragmentShader:`varying vec2 uvScreen;uniform sampler2D source;uniform vec2 direction;void main(){vec3 c=vec3(0.);float sum=0.;for(int i=-12;i<=12;i++){float f=float(i),weight=exp(-f*f/32.);c+=texture2D(source,uvScreen+direction*f).rgb*weight;sum+=weight;}gl_FragColor=vec4(c/sum,1.);}`});
const postMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{cinema,lightLevel:studioLight,source:{value:dof.target.texture},bloom:{value:bloomA.texture}},vertexShader:postVertex,fragmentShader:`varying vec2 uvScreen;uniform sampler2D source;uniform sampler2D bloom;uniform float lightLevel;uniform float cinema;
void main(){vec4 base=texture2D(source,uvScreen);
// Composite over the studio background in linear light, with opaque output.
// Bloom energy must never be divided by its own coverage: that normalizes
// every faint halo pixel to white and creates a solid expanded silhouette.
float vignette=smoothstep(.0,.8,length((uvScreen-.5)*vec2(1.,.8)));
vec3 background=mix(vec3(.57,.58,.60),vec3(.50,.51,.53),vignette)*(.035+.965*lightLevel);
vec2 backdropPoint=(uvScreen-vec2(.46,.57))*vec2(1.,.8);
float halo=exp(-dot(backdropPoint,backdropPoint)*5.5);
vec3 filmBackground=mix(vec3(.009,.012,.018),vec3(.075,.084,.102),halo)*(.08+.92*lightLevel);
background=mix(background,filmBackground,cinema);
vec3 spread=max(texture2D(bloom,uvScreen).rgb,vec3(0.));
vec3 glow=mix(.22,.32,cinema)*(vec3(1.)-exp(-spread*.65));
// Continuous, centered horizontal optical diffusion; no displaced ghost copies.
if(cinema>.5){
vec3 streak=vec3(0.);float weightSum=0.;
for(int i=-24;i<=24;i++){float t=float(i)/24.;float weight=exp(-t*t*5.);streak+=texture2D(bloom,uvScreen+vec2(t*.055,0.)).rgb*weight;weightSum+=weight;}
glow+=.035*(vec3(1.)-exp(-streak/weightSum*.45));
}
gl_FragColor=vec4(base.rgb+background*(1.-base.a)+glow,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
const glass=createGlassCompositor(renderer,cinema);
const postQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial);postScene.add(postQuad);
function composite(){
 renderer.setRenderTarget(hdr);renderer.render(scene,camera);
 dof.render();
 postQuad.material=extractMaterial;renderer.setRenderTarget(bloomA);renderer.render(postScene,postCamera);
 postQuad.material=blurMaterial;
 for(let pass=0;pass<2;pass++){
  blurMaterial.uniforms.source.value=bloomA.texture;blurMaterial.uniforms.direction.value.set(1/bloomA.width,0);renderer.setRenderTarget(bloomB);renderer.render(postScene,postCamera);
  blurMaterial.uniforms.source.value=bloomB.texture;blurMaterial.uniforms.direction.value.set(0,1/bloomA.height);renderer.setRenderTarget(bloomA);renderer.render(postScene,postCamera);
 }
 postQuad.material=postMaterial;renderer.setRenderTarget(glass.target);renderer.render(postScene,postCamera);
 glass.render();
}
function setStudioLight(percent){
 if(!Number.isFinite(percent))return;
 const value=clamp(percent,0,250)/100;studioLight.value=value;
 ambient.intensity=(cinema.value?.13:.55)*value;key.intensity=(cinema.value?135:115)*value;fill.intensity=(cinema.value?.24:.75)*value;rimLight.intensity=(cinema.value?2.4:1.6)*value;
 scene.environment=cinema.value?filmEnv.texture:env.texture;
 scene.environmentIntensity=value*(cinema.value?1.05:1);
 renderer.toneMappingExposure=cinema.value?1.05:1.15;
 key.color.setHex(cinema.value?0xfff3e4:0xfff5e8);rimLight.color.setHex(cinema.value?0xe3edff:0xffffff);
 document.body.classList.toggle('cinematic',!!cinema.value);
 $('#cinema').setAttribute('aria-pressed',!!cinema.value);
 $('#light').value=Math.round(value*100);$('#light-value').value=Math.round(value*100)+'%';
 $('#light').setAttribute('aria-valuetext',Math.round(value*100)+' per cento');
}
$('#cinema').onclick=()=>{cinema.value=1-cinema.value;setStudioLight(studioLight.value*100);};
$('#light').oninput=e=>setStudioLight(Number(e.target.value));
document.querySelectorAll('.finish').forEach(button=>button.addEventListener('click',()=>setFinish(button.dataset.finish)));
setFinish('titanium');
setStudioLight(100);
const resize=()=>{const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new THREE.Vector2());hdr.setSize(size.x,size.y);dof.resize(size.x,size.y,r.width,r.height);bloomA.setSize(Math.max(1,Math.ceil(size.x/4)),Math.max(1,Math.ceil(size.y/4)));bloomB.setSize(bloomA.width,bloomA.height);glass.resize(size.x,size.y,r.width,r.height);};new ResizeObserver(resize).observe(stage);resize();
const deviceInverse=new THREE.Matrix4(),cameraInDevice=new THREE.Vector3();
let previous=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;
 if(tween){const t=clamp((now-tween.start)/tween.duration),ease=t*t*t*(t*(t*6-15)+10);progress(tween.from+(tween.to-tween.from)*ease);if(t===1){target=p;tween=null;}}
 else if(Math.abs(target-p)>.00001)progress(p+(target-p)*(1-Math.exp(-dt*24)));
 if(!pointers.size&&!reduced){rotationVelocity.multiplyScalar(Math.exp(-dt*9));orientation.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rotationVelocity.x*dt*45,rotationVelocity.y*dt*45,0)));}
 root.quaternion.slerp(orientation,1-Math.exp(-dt*20));
 const theta=Math.PI*(1-p);left.rotation.y=theta;
 // Camera follows the changing silhouette center, independent of its orbit.
 device.position.x=-(w-w*Math.cos(theta))*.25;
 root.position.set(pan.x,pan.y+(floating?Math.sin(now*.0007)*.055:0),0);
 camera.position.z=THREE.MathUtils.lerp(camera.position.z,zoom/Math.min(1,camera.aspect/.95),1-Math.exp(-dt*14));
 left.updateMatrix();right.updateMatrix();hingeGroup.rotation.y=theta*.5;
 // The spine tucks between both shells when closed instead of reading as a third slab.
 const hingeTuck=.62+.38*p;hingeGroup.scale.set(hingeTuck,1,.76+.24*p);hingeGroup.position.z=.025*(1-p);
 device.updateWorldMatrix(true,true);camera.updateMatrixWorld();
 deviceInverse.copy(device.matrixWorld).invert();cameraInDevice.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(deviceInverse);
 for(const u of uniforms){u.opening.value=p;u.deviceInverse.value.copy(deviceInverse);u.cameraInDevice.value.copy(cameraInDevice);u.visibleFace.value=1;}
 if(loaded)composite();
}requestAnimationFrame(frame);
const photo=new Image();
function cover(c,img,x,y,w,h){const s=Math.max(w/img.width,h/img.height);c.drawImage(img,x+(w-img.width*s)/2,y+(h-img.height*s)/2,img.width*s,img.height*s)}
function makePlate(w,img=photo){const scale=matchMedia('(pointer: coarse)').matches?3:6;const p=document.createElement('canvas');p.width=w*scale;p.height=H*scale;const c=p.getContext('2d');c.scale(scale,scale);cover(c,img,0,0,w,H);const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#07122244');shade.addColorStop(.42,'#07122200');shade.addColorStop(1,'#03091138');c.fillStyle=shade;c.fillRect(0,0,w,H);c.textAlign='center';c.fillStyle='#ffffffdb';c.font='500 9px Arial';c.fillText('Giovedì, 10 settembre',w/2,42);c.save();c.translate(w/2,0);c.scale(.54,1);c.font='200 144px Arial';c.fillText('9:41',0,169);c.restore();c.strokeStyle='#ffffffd9';c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.moveTo(w/2-34,H-11);c.lineTo(w/2+34,H-11);c.stroke();for(let i=0;i<2;i++){const cy=H-40-i*31;c.fillStyle='#10192165';c.beginPath();c.arc(w-24,cy,10,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.lineWidth=1;if(i===0){c.strokeRect(w-28,cy-3,8,6);c.beginPath();c.arc(w-24,cy,2,0,7);c.stroke()}else{c.beginPath();c.moveTo(w-24,cy-5);c.lineTo(w-26,cy+1);c.lineTo(w-22,cy+1);c.lineTo(w-24,cy+5);c.stroke()}}return p}
function blurAtlas(source,w){
 const base=document.createElement('canvas');base.width=w;base.height=H;
 const c=base.getContext('2d');c.drawImage(source,0,0,w,H);
 const original=c.getImageData(0,0,w,H).data,bw=w+2*PAD,bh=H+2*PAD;
 const padded=new Uint8ClampedArray(bw*bh*4);
 for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){
  const a=(clamp(y-PAD,0,H-1)*w+clamp(x-PAD,0,w-1))*4,b=(y*bw+x)*4;
  padded.set(original.subarray(a,a+4),b);
 }
 function box(src,r,horizontal){
  const out=new Uint8ClampedArray(src.length),length=horizontal?bw:bh,lines=horizontal?bh:bw;
  const index=(line,pos)=>horizontal?(line*bw+pos)*4:(pos*bw+line)*4;
  for(let line=0;line<lines;line++){
   const sum=[0,0,0,0];
   for(let k=-r;k<=r;k++){const i=index(line,clamp(k,0,length-1));for(let ch=0;ch<4;ch++)sum[ch]+=src[i+ch]}
   for(let pos=0;pos<length;pos++){
    const dest=index(line,pos),remove=index(line,clamp(pos-r,0,length-1)),add=index(line,clamp(pos+r+1,0,length-1));
    for(let ch=0;ch<4;ch++){out[dest+ch]=sum[ch]/(r*2+1);sum[ch]+=src[add+ch]-src[remove+ch]}
   }
  }return out;
 }
 return [3,9,20].map(radius=>{
  let pixels=padded;for(let pass=0;pass<3;pass++){pixels=box(pixels,radius,true);pixels=box(pixels,radius,false)}
  const blurred=document.createElement('canvas');blurred.width=bw;blurred.height=bh;
  blurred.getContext('2d').putImageData(new ImageData(pixels,bw,bh),0,0);return blurred;
 });
}

function texture(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
function applyPhoto(image){
 const closed=makePlate(W,image),opened=makePlate(W*2,image);
 const cb=blurAtlas(closed,W)[2],ob=blurAtlas(opened,W*2)[2];
 function cropped(c,width){const out=document.createElement('canvas');out.width=width;out.height=H;out.getContext('2d').drawImage(c,PAD,PAD,width,H,0,0,width,H);return texture(out)}
 const textures=[];
 try{
 const ct=texture(closed);textures.push(ct);const ot=texture(opened);textures.push(ot);const cblur=cropped(cb,W);textures.push(cblur);const oblur=cropped(ob,W*2);textures.push(oblur);
 const previous=new Set(uniforms.flatMap(u=>[u.picture.value,u.blurred.value]).filter(Boolean));
 for(const u of uniforms){u.picture.value=u.face.value===2?ct:ot;u.blurred.value=u.face.value===2?cblur:oblur;}
 previous.forEach(t=>t.dispose());loaded=true;$('#loading').hidden=true;progress(p);
 }catch(error){textures.forEach(t=>t.dispose());throw error;}
}
photo.onload=()=>{if(imageRevision>0)return;try{applyPhoto(photo)}catch(error){$('#loading').textContent='Impossibile preparare il display. Ricarica la pagina.';console.error(error)}};
photo.onerror=()=>{if(!loaded)$('#loading').textContent='Impossibile caricare lo sfondo. Puoi scegliere una tua immagine.'};
let imageRevision=0;photo.src='background.png';
$('#upload-image').onclick=()=>$('#image-file').click();
$('#image-file').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 const status=$('#image-status');
 if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>20*1024*1024){status.textContent='Scegli un JPG, PNG, WebP o AVIF fino a 20 MB.';e.target.value='';return;}
 const revision=++imageRevision;const url=URL.createObjectURL(file);status.textContent='Preparazione immagine…';$('#upload-image').disabled=true;
 try{const image=new Image();image.src=url;await image.decode();if(revision!==imageRevision)return;
 await new Promise(resolve=>requestAnimationFrame(resolve));applyPhoto(image);status.textContent='Immagine aggiornata su entrambi i display.';
 }catch(error){status.textContent='Impossibile leggere questa immagine. Prova un altro file.';if(!loaded)imageRevision=0;if(!loaded&&photo.complete&&photo.naturalWidth)applyPhoto(photo);}
 finally{URL.revokeObjectURL(url);$('#upload-image').disabled=false;e.target.value='';glass.measure();}
};
$('#controls-toggle').onclick=()=>{
 const panel=$('#control-panel'),collapsed=!panel.hidden;panel.hidden=collapsed;
 $('#controls-toggle').setAttribute('aria-expanded',!collapsed);$('#controls-toggle').textContent=collapsed?'Mostra controlli ⌃':'Nascondi controlli ⌄';
 document.body.classList.toggle('controls-collapsed',collapsed);glass.measure();
};
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();loaded=false;$('#loading').hidden=false;$('#loading').textContent='Contesto grafico interrotto. Ricarica la pagina.'});
// Optional agent access uses exactly the same opening control as the interface.
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'set_fold_opening',description:'Imposta l’apertura del dispositivo 3D da 0 (chiuso) a 100 (aperto).',inputSchema:{type:'object',properties:{percent:{type:'number',minimum:0,maximum:100}},required:['percent'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Number.isFinite(input.percent)||input.percent<0||input.percent>100)throw new Error('Percentuale non valida');tween=null;target=input.percent/100;progress(target);return {percent:Math.round(p*100)};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
