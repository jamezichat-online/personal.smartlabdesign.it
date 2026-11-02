import * as THREE from 'three';
import {initShop,openSheet} from './shop.js';
import * as sound from './sound.js';
const hasGL=(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch(e){return false}})();
if(!hasGL){document.documentElement.classList.add('vsr-nogl');document.querySelector('#loading')?.remove();{const g=document.createElement('div');g.className='vsr-nogl-grid';g.innerHTML=products.map(p=>`<a href="${p.url}" target="_blank" rel="noopener"><img src="${p.src}" alt="${p.name}" width="300" height="300" style="width:100%;height:auto"><span>${p.name}</span></a>`).join('');document.querySelector('.vsr-main .bottom')?.before(g)}throw new Error('WebGL unavailable: static fallback shown')}
import {products} from './products.js';
import {smoothstep,clothDepth,pendulumStep,collarY,loopVisibility,EDGE_START,EDGE_END} from './dynamics.js';
const $=s=>document.querySelector(s),host=$('#scene'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new THREE.Scene();scene.background=new THREE.Color('#030304');
const glowCanvas=document.createElement('canvas'),glowTex=new THREE.CanvasTexture(glowCanvas);glowTex.colorSpace=THREE.SRGBColorSpace;
function paintGlow(w,h){glowCanvas.width=Math.max(2,Math.round(w/2));glowCanvas.height=Math.max(2,Math.round(h/2));const c=glowCanvas.getContext('2d'),W=glowCanvas.width,H=glowCanvas.height;
 c.fillStyle='#030304';c.fillRect(0,0,W,H);
 const blob=(cx,cy,rx,ry,a0,stop)=>{c.save();c.translate(cx*W,cy*H);c.scale(rx*W,ry*H);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(157,114,255,${a0})`);g.addColorStop(stop,'rgba(157,114,255,0)');c.fillStyle=g;c.fillRect(-2,-2,4,4);c.restore()};
 blob(.5,.52,.46,.46,.2,.72); // central halo behind the hero piece
 blob(.5,1.12,1.1,.4,.4,.7);  // violet bloom rising from the floor
 glowTex.needsUpdate=true;scene.background=glowTex}
const camera=new THREE.PerspectiveCamera(39,1,.1,60);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.prepend(renderer.domElement);
const room=document.createElement('canvas');room.width=1024;room.height=512;const ec=room.getContext('2d');ec.fillStyle='#15131c';ec.fillRect(0,0,1024,512);const boxes=[[50,45,175,210,'#fff7ec'],[420,5,210,90,'#fff'],[800,60,90,290,'#dbd0ff'],[300,310,300,60,'#4d465e']];for(const [x,y,w,h,c]of boxes){ec.fillStyle=c;ec.fillRect(x,y,w,h)}{const gb=ec.createLinearGradient(0,330,0,512);gb.addColorStop(0,'#2a2540');gb.addColorStop(1,'#a89be0');ec.fillStyle=gb;ec.fillRect(0,330,1024,182)}const rt=new THREE.CanvasTexture(room);rt.mapping=THREE.EquirectangularReflectionMapping;rt.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(rt);scene.environment=env.texture;scene.environmentIntensity=.6;rt.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight('#f0eafc','#19151d',.8));
const key=new THREE.DirectionalLight('#fff4e8',1.7);key.position.set(-4,8,6);key.castShadow=false;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-13,right:13,top:7,bottom:-7,near:1,far:30});key.shadow.bias=-.00015;key.shadow.normalBias=.025;key.shadow.radius=5;scene.add(key);
const rim=new THREE.DirectionalLight('#9d86ff',1.15);rim.position.set(-5.5,2.5,-6);scene.add(rim);const fill=new THREE.DirectionalLight('#b9a5f5',.8);fill.position.set(6,3,-2);scene.add(fill);const soft=new THREE.DirectionalLight('#fff',.4);soft.position.set(0,0,8);scene.add(soft);
const contact=new THREE.DirectionalLight('#f4efff',.48);contact.position.set(-3.6,5.5,7);contact.castShadow=true;contact.shadow.mapSize.set(1024,1024);Object.assign(contact.shadow.camera,{left:-11,right:11,top:6,bottom:-6,near:1,far:28});contact.shadow.bias=-.00015;contact.shadow.normalBias=.045;contact.shadow.radius=4;scene.add(contact);
const metal=new THREE.MeshPhysicalMaterial({color:'#a8a7ae',metalness:1,roughness:.19,clearcoat:.8,clearcoatRoughness:.12,envMapIntensity:2.1});
// True 3D arc: the rail recedes from the viewer toward both ends (cylindrical carousel), so perspective alone
// thins it and shrinks the garments hanging from it. y rises toward the ends to keep the visible sag of the video.
const RAIL_KY=.028,RAIL_KZ=.09;
function railPosition(x,out=new THREE.Vector3()){const a=Math.abs(x),c=Math.min(a,8),e=a-c,sg=x<0?-1:1;return out.set(x,2.45+RAIL_KY*c*c+2*RAIL_KY*8*e,-RAIL_KZ*c*c-2*RAIL_KZ*8*e)}
const yAxis=new THREE.Vector3(0,1,0),tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3(),tmpAxis=new THREE.Vector3();const slot=a=>a<=1?a*2.35:2.35+(a-1)*2.05;
let currentEdgeStart=EDGE_START,currentEdgeEnd=EDGE_END;
const railFadeUniforms={edgeStart:{value:EDGE_START},edgeEnd:{value:EDGE_END}};
const pathPoints=[];for(let i=0;i<=240;i++){const x=-40+i/240*80;pathPoints.push(railPosition(x))}const railCurve=new THREE.CatmullRomCurve3(pathPoints);const railTaper=x=>.62+.58*Math.exp(-((x/3.2)*(x/3.2))); // steel tube radius factor: fat at the centre (near), slim at the ends (far)
const railGeo=new THREE.TubeGeometry(railCurve,360,.068,24,false);
{const pa=railGeo.attributes.position,rs=25;for(let i=0;i<=360;i++){const c=railCurve.getPointAt(i/360),f=railTaper(c.x);for(let j=0;j<rs;j++){const k=i*rs+j;pa.setXYZ(k,c.x+(pa.getX(k)-c.x)*f,c.y+(pa.getY(k)-c.y)*f,c.z+(pa.getZ(k)-c.z)*f)}}pa.needsUpdate=true}
const rail=new THREE.Mesh(railGeo,metal);rail.material=metal.clone();rail.material.transparent=true;rail.material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,railFadeUniforms);shader.vertexShader='varying float railWorldX;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nrailWorldX=(modelMatrix*vec4(transformed,1.)).x;');shader.fragmentShader='varying float railWorldX;uniform float edgeStart;uniform float edgeEnd;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a *= 1.-smoothstep(edgeStart,edgeEnd,abs(railWorldX));\n#include <alphatest_fragment>')};rail.castShadow=false;scene.add(rail);
// Small machined collars catch the studio strips at each rail junction.
for(const x of [-8,8]){const collar=new THREE.Mesh(new THREE.CylinderGeometry(.066,.066,.08,32),rail.material);collar.rotation.z=Math.PI/2;railPosition(x,collar.position);scene.add(collar)}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,30),new THREE.ShadowMaterial({color:'#000000',opacity:.22}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.55;floor.receiveShadow=true;scene.add(floor);
const fabric=document.createElement('canvas');fabric.width=fabric.height=256;const fc=fabric.getContext('2d'),noise=fc.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){let a=(y*256+x)*4,n=125+Math.sin(x*Math.PI)*7+(Math.random()-.5)*20+(x%2===y%2?7:-7);noise.data[a]=noise.data[a+1]=noise.data[a+2]=n;noise.data[a+3]=255}fc.putImageData(noise,0,0);const weave=new THREE.CanvasTexture(fabric);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(14,14);
const hangerCurve=pts=>new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
function tube(curve,r=.015){const m=new THREE.Mesh(new THREE.TubeGeometry(curve,56,r,12,false),metal.clone());m.castShadow=true;return m}
function makeRailHook(){
 // Closed ring, clearly larger than the tube: the rail rests against the inside top of the loop and the
 // empty lower part of the opening shows it passes THROUGH. The ring is turned toward the viewer (phi) and
 // stretched by 1/cos(phi) along the rail axis so the tube never touches the wire. Depth-only rail pass
 // hides the rear arc behind the tube; the front arc crosses in front.
 const g=new THREE.Group(),crook=new THREE.Group(),points=[];
 const R=.115,wire=.0125,tubeR=.068,phi=0,rz=R,cy=tubeR+wire+.004-R;
 for(let i=0;i<=96;i++){const t=i/96*Math.PI*2;points.push([0,cy+R*Math.cos(t),rz*Math.sin(t)])}
 crook.add(tube(hangerCurve(points),wire));
 crook.add(tube(hangerCurve([[0,cy-R,0],[0,cy-R-.02,0],[0,-.17,0]]),.012));
 crook.rotation.y=phi;g.add(crook);g.position.y=-.001;
 return g;
}
function makeHanger(){
 const g=new THREE.Group();
 // The swivel starts beneath the fixed crook; the crook itself never follows garment yaw.
 g.add(tube(hangerCurve([[0,-.17,0],[0,-.30,0],[0,-.46,-.005]]),.012));
 g.add(tube(hangerCurve([[0,-.46,-.005],[-.22,-.49,-.005],[-.62,-.59,-.005],[-.9,-.69,-.005],[-.98,-.73,-.005],[-.99,-.79,-.005],[-.92,-.82,-.005],[0,-.82,-.005],[.92,-.82,-.005],[.99,-.79,-.005],[.98,-.73,-.005],[.9,-.69,-.005],[.62,-.59,-.005],[.22,-.49,-.005],[0,-.46,-.005]]),.012));
 return g;
}
function makeCollar(){
 const pts=[];for(let i=0;i<=80;i++){const t=i/80*Math.PI*2;pts.push(new THREE.Vector3(.36*Math.cos(t),-.405-.165*Math.max(0,Math.sin(t)),.065*Math.sin(t)))}
 return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),100,.015,9,false),new THREE.MeshPhysicalMaterial({color:'#18171b',roughness:.98,bumpMap:weave,bumpScale:.003,sheen:.2}));
}
// Photo alpha drives both the exact silhouette and the joined front/back shell.
function makeCloth(tex){const N=96,S=N+1,maskCanvas=document.createElement('canvas');maskCanvas.width=maskCanvas.height=S;const mc=maskCanvas.getContext('2d',{willReadFrequently:true});mc.drawImage(tex.image,0,0,S,S);const pixels=mc.getImageData(0,0,S,S).data;const inside=new Uint8Array(S*S),dist=new Float32Array(S*S);for(let j=0;j<S;j++)for(let i=0;i<S;i++){let k=j*S+i;inside[k]=pixels[k*4+3]>100?1:0;dist[k]=inside[k]?999:0}
for(let j=0;j<S;j++)for(let i=0;i<S;i++){let k=j*S+i;if(i)dist[k]=Math.min(dist[k],dist[k-1]+1);if(j)dist[k]=Math.min(dist[k],dist[k-S]+1)}for(let j=S-1;j>=0;j--)for(let i=S-1;i>=0;i--){let k=j*S+i;if(i<N)dist[k]=Math.min(dist[k],dist[k+1]+1);if(j<N)dist[k]=Math.min(dist[k],dist[k+S]+1)}
 const vertices=[],uvs=[],indices=[];const width=3.55,height=3.55;for(let side=0;side<2;side++)for(let j=0;j<S;j++)for(let i=0;i<S;i++){const u=i/N,v=j/N,x=(u-.5)*width,y=-.19-v*height;const {depth:thickness,folds}=clothDepth(x,v,dist[j*S+i]);vertices.push(x,y,side===0?thickness+folds:-thickness+folds);uvs.push(u,1-v)}
 const layer=S*S;for(let j=0;j<N;j++)for(let i=0;i<N;i++){let a=j*S+i,b=a+1,c=a+S,d=c+1;if(!inside[a]&&!inside[b]&&!inside[c]&&!inside[d])continue;indices.push(a,c,b,b,c,d);indices.push(a+layer,b+layer,c+layer,b+layer,d+layer,c+layer)}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
 const frontMask=document.createElement('canvas');frontMask.width=frontMask.height=S;const fmc=frontMask.getContext('2d'),fd=fmc.createImageData(S,S);for(let j=0;j<S;j++)for(let i=0;i<S;i++){const k=j*S+i,x=(i/N-.5)*3.55,y=-.19-j/N*3.55;let v=pixels[k*4+3];if(Math.abs(x)<.36&&y>collarY(x))v=0;fd.data[k*4]=fd.data[k*4+1]=fd.data[k*4+2]=v;fd.data[k*4+3]=255}fmc.putImageData(fd,0,0);const neckMask=new THREE.CanvasTexture(frontMask);const front=new THREE.MeshPhysicalMaterial({map:tex,alphaMap:neckMask,transparent:true,opacity:1,alphaTest:.18,side:THREE.FrontSide,roughness:.97,metalness:0,bumpMap:weave,bumpScale:.005,envMapIntensity:.25,sheen:.35,sheenColor:new THREE.Color('#88838d'),sheenRoughness:1});
 const alphaCanvas=document.createElement('canvas');alphaCanvas.width=alphaCanvas.height=S;const ac=alphaCanvas.getContext('2d'),ad=ac.createImageData(S,S);for(let i=0;i<S*S;i++){let v=pixels[i*4+3];ad.data[i*4]=ad.data[i*4+1]=ad.data[i*4+2]=v;ad.data[i*4+3]=255}ac.putImageData(ad,0,0);const alphaTexture=new THREE.CanvasTexture(alphaCanvas);const back=new THREE.MeshPhysicalMaterial({color:'#101014',alphaMap:alphaTexture,transparent:true,opacity:1,alphaTest:.18,side:THREE.FrontSide,roughness:.98,bumpMap:weave,bumpScale:.008,sheen:.3,envMapIntensity:.3});
 // Separate materials ensure the print is confined to the real front of the garment.
 geo.clearGroups();for(let j=0;j<indices.length;j+=12){geo.addGroup(j,6,0);geo.addGroup(j+6,6,1)}
 // Consolidate draw groups for efficient rendering.
 const fidx=[],bidx=[];for(let i=0;i<indices.length;i+=12){fidx.push(...indices.slice(i,i+6));bidx.push(...indices.slice(i+6,i+12))}geo.setIndex([...fidx,...bidx]);geo.clearGroups();geo.addGroup(0,fidx.length,0);geo.addGroup(fidx.length,bidx.length,1);
 for(const material of [front,back]){material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#ifdef USE_ALPHATEST\nif(diffuseColor.a / max(opacity,0.00001) < alphaTest) discard;\n#endif')};material.customProgramCacheKey=()=> 'stable-alpha-before-group-fade';}
 const mesh=new THREE.Mesh(geo,[front,back]);mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:tex,alphaTest:.45,side:THREE.DoubleSide});mesh.userData.base=Float32Array.from(vertices);return mesh}
let position=0,target=0,velocity=0,active=0,frontIndex=-1,dragging=false,dragStart=0,lastX=0,lastY=0,travel=0,lastStamp=0,grabVelocity=0,gesture=false;
const railAxis=new THREE.Vector3(1,0,0);
const garments=products.map((p,i)=>{
 const root=new THREE.Group(),pivot=new THREE.Group(),hook=makeRailHook();
 const coupling=new THREE.Mesh(new THREE.CylinderGeometry(.035,.032,.065,20),metal.clone());coupling.position.y=-.17;
 const sway=new THREE.Group();root.add(hook,coupling,sway);sway.position.y=-.17;sway.add(pivot);
 const hanger=makeHanger(),collar=makeCollar();hanger.position.y=collar.position.y=.17;pivot.add(hanger,collar);
 scene.add(root);root.userData.index=i;
 return {root,pivot,hook,coupling,sway,index:i,yaw:-1.14,angle:0,angularVelocity:0,cloth:null,loaded:false,flex:0,lastOpacity:1,phase:i*1.91,selection:0};
});
const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');let finished=0,failures=0;
for(let i=0;i<products.length;i++){loader.load(products[i].src,tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();try{const mesh=makeCloth(tex);mesh.userData.index=i;garments[i].cloth=mesh;mesh.position.y=.17;garments[i].pivot.add(mesh);garments[i].loaded=true;garments[i].materials=[];garments[i].root.traverse(o=>{if(o.isMesh){for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.transparent=false;m.opacity=1;garments[i].materials.push(m)}}})}catch(e){failures++;console.error('Garment construction',e)}ready()},undefined,e=>{failures++;console.error('Texture',e);ready()})}
function ready(){finished++;if(finished===products.length){$('#loading').classList.add('hidden');$('#loading').setAttribute('aria-hidden','true');if(failures){const e=document.createElement('p');e.className='error-notice';e.textContent=failures+' piece(s) failed to load. Check your connection and reload.';host.after(e)}wake()}else wake()}
function wrap(v){return((v+4.5)%9+9)%9-4.5}
function current(){return((Math.round(position)%9)+9)%9}
function updateInfo(){active=current();const p=products[active];$('#name').textContent=p.name;$('#category').textContent=p.category.toUpperCase();$('#count').textContent=String(active+1).padStart(2,'0')+' / 09';$('#track-indicator').style.transform=`translateX(${active*100}%)`}
const sceneTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:2,depthBuffer:true});
const blurTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
const compositionTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
const shadowScratch=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
const postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),postScene=new THREE.Scene();
const shaderVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
// The projected rectangle is applied in the vertex shader so each complete assembly is composited once.
const layerVertex='varying vec2 vUv;uniform vec4 rect;void main(){vUv=uv;gl_Position=vec4(position.xy*rect.zw+rect.xy,0.,1.);}';
const blurFragment=`uniform sampler2D inputTexture;uniform vec2 resolution;uniform vec2 direction;uniform vec2 edgeRange;varying vec2 vUv;
void main(){float edge=abs(vUv.x*2.-1.);float radius=2.3*smoothstep(edgeRange.x,edgeRange.y,edge);vec2 off=direction/resolution*radius;
vec4 c=texture2D(inputTexture,vUv)*.227027;
c+=texture2D(inputTexture,vUv+off*1.384615)*.316216;
c+=texture2D(inputTexture,vUv-off*1.384615)*.316216;
c+=texture2D(inputTexture,vUv+off*3.230769)*.070270;
c+=texture2D(inputTexture,vUv-off*3.230769)*.070270;
gl_FragColor=c;}`;
function blurMaterial(verticalPass){return new THREE.ShaderMaterial({vertexShader:shaderVertex,fragmentShader:blurFragment,uniforms:{inputTexture:{value:null},resolution:{value:new THREE.Vector2(1,1)},direction:{value:new THREE.Vector2(verticalPass?0:1,verticalPass?1:0)},edgeRange:{value:new THREE.Vector2(.6,.8)}},depthTest:false,depthWrite:false,toneMapped:false})}
const horizontal=blurMaterial(false),vertical=blurMaterial(true);
const assemblyMaterial=new THREE.ShaderMaterial({vertexShader:layerVertex,fragmentShader:`uniform sampler2D inputTexture;uniform vec2 texel;uniform float blurRadius;uniform float assemblyOpacity;varying vec2 vUv;
float kernelWeight(int i){int j=abs(i);return j==0?.227027:(j==1?.316216:.070270);}
float kernelOffset(int i){int j=abs(i);return sign(float(i))*(j==1?1.384615:(j==2?3.230769:0.));}
void main(){vec4 c=vec4(0.);for(int y=-2;y<=2;y++){for(int x=-2;x<=2;x++){vec2 o=vec2(kernelOffset(x),kernelOffset(y))*texel*blurRadius;c+=texture2D(inputTexture,vUv+o)*kernelWeight(x)*kernelWeight(y);}}gl_FragColor=c*assemblyOpacity;}`,uniforms:{inputTexture:{value:null},texel:{value:new THREE.Vector2(1,1)},blurRadius:{value:0},assemblyOpacity:{value:1},rect:{value:new THREE.Vector4(0,0,1,1)}},transparent:true,premultipliedAlpha:true,depthTest:false,depthWrite:false,toneMapped:false});
const finalMaterial=new THREE.ShaderMaterial({vertexShader:shaderVertex,fragmentShader:`uniform sampler2D inputTexture;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(inputTexture,vUv).rgb,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
gl_FragColor.rgb=max(gl_FragColor.rgb,vec3(3.,3.,4.)/255.);}`,uniforms:{inputTexture:{value:compositionTarget.texture}},depthTest:false,depthWrite:false,toneMapped:true});
const postQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),horizontal);postQuad.frustumCulled=false;postScene.add(postQuad);
const railDepthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,depthTest:true,side:THREE.DoubleSide});
const baseObjects=scene.children.filter(o=>o.isMesh),bounds=new THREE.Box3(),corner=new THREE.Vector3();
function assemblyRect(g,W,H){
 bounds.setFromObject(g.root);bounds.expandByScalar(.075);
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(let i=0;i<8;i++){corner.set(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z).project(camera);let x=(corner.x*.5+.5)*W,y=(.5-corner.y*.5)*H;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 const x=Math.max(-64,Math.floor(minX)-12),y=Math.max(-64,Math.floor(minY)-12);
 const width=Math.max(64,Math.ceil((Math.min(W+64,maxX+12)-x)/64)*64),height=Math.max(64,Math.ceil((Math.min(H+64,maxY+12)-y)/64)*64);
 return {x,y,width,height};
}
function renderScene(){
 const W=sceneTarget.width,H=sceneTarget.height;
 const visibleItems=garments.filter(g=>g.loaded&&g.opacity>.004);
 // Shadow maps retain all assemblies even when their color layers are rendered separately.
 renderer.shadowMap.autoUpdate=true;renderer.setRenderTarget(shadowScratch);renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false;
 garments.forEach(g=>g.root.visible=false);
 renderer.setRenderTarget(sceneTarget);renderer.render(scene,camera);
 horizontal.uniforms.inputTexture.value=sceneTarget.texture;postQuad.material=horizontal;renderer.setRenderTarget(blurTarget);renderer.render(postScene,postCamera);
 vertical.uniforms.inputTexture.value=blurTarget.texture;postQuad.material=vertical;renderer.setRenderTarget(compositionTarget);renderer.render(postScene,postCamera);
 const oldBackground=scene.background;scene.background=null;baseObjects.forEach(o=>o.visible=false);renderer.setClearColor(0x000000,0);
 // The selected assembly is drawn last as a single opaque depth-resolved unit, above both neighbours.
 visibleItems.sort((a,b)=>{if(a.index===frontIndex)return 1;if(b.index===frontIndex)return -1;return Math.abs(wrap(b.index-position))-Math.abs(wrap(a.index-position))});
 for(const g of visibleItems){
  g.root.visible=true;g.root.updateWorldMatrix(true,true);const r=assemblyRect(g,W,H);
  if(!g.layer)g.layer=new THREE.WebGLRenderTarget(r.width,r.height,{type:THREE.HalfFloatType,samples:2,depthBuffer:true});
  if(g.layer.width!==r.width||g.layer.height!==r.height)g.layer.setSize(r.width,r.height);
  camera.setViewOffset(W,H,r.x,r.y,r.width,r.height);renderer.autoClear=true;
  // Resolve the physical rail/hook depth before flattening the complete assembly.
  // The rear of the crook must remain behind the tube, even though the assembly is composited on top.
  const visibleRailMaterial=rail.material;rail.material=railDepthMaterial;rail.visible=true;
  renderer.setRenderTarget(g.layer);renderer.render(scene,camera);
  rail.material=visibleRailMaterial;rail.visible=false;camera.clearViewOffset();g.root.visible=false;
  const u=assemblyMaterial.uniforms;u.inputTexture.value=g.layer.texture;u.texel.value.set(1/r.width,1/r.height);u.blurRadius.value=2.3*(1-g.opacity);u.assemblyOpacity.value=g.opacity;u.rect.value.set((r.x+r.width/2)/W*2-1,1-(r.y+r.height/2)/H*2,r.width/W,r.height/H);
  postQuad.material=assemblyMaterial;renderer.autoClear=false;renderer.setRenderTarget(compositionTarget);renderer.render(postScene,postCamera);
 }
 renderer.autoClear=true;scene.background=oldBackground;renderer.setClearColor('#030304',1);baseObjects.forEach(o=>o.visible=true);garments.forEach(g=>g.root.visible=g.loaded&&g.opacity>.004);
 postQuad.material=finalMaterial;renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
}
function resize(){const w=host.clientWidth,h=host.clientHeight;paintGlow(w,h);renderer.setSize(w,h);const pr=renderer.getPixelRatio(),pw=Math.round(w*pr),ph=Math.round(h*pr);sceneTarget.setSize(pw,ph);blurTarget.setSize(pw,ph);compositionTarget.setSize(pw,ph);horizontal.uniforms.resolution.value.set(pw,ph);vertical.uniforms.resolution.value.set(pw,ph);camera.aspect=w/h;const framing=smoothstep(360,1200,w);camera.fov=37.5-2.5*framing;camera.position.set(0,.78,9.35-.25*framing);camera.lookAt(0,.65,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();function worldAt(ndc){let lo=0,hi=14;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(Math.abs(railPosition(mid).project(camera).x)<ndc)lo=mid;else hi=mid}return (lo+hi)/2}currentEdgeStart=Math.min(EDGE_START,worldAt(.59));currentEdgeEnd=Math.min(EDGE_END,worldAt(.96));railFadeUniforms.edgeStart.value=currentEdgeStart;railFadeUniforms.edgeEnd.value=currentEdgeEnd;const edgeA=Math.abs(railPosition(currentEdgeStart).project(camera).x),edgeB=Math.abs(railPosition(currentEdgeEnd).project(camera).x);horizontal.uniforms.edgeRange.value.set(edgeA,edgeB);vertical.uniforms.edgeRange.value.set(edgeA,edgeB);wake()}new ResizeObserver(resize).observe(host);
let running=false,previous=0,visible=true,elapsed=0;
function wake(){if(!running&&visible&&!document.hidden){running=true;previous=performance.now();requestAnimationFrame(frame)}}
let priorVelocity=0,filteredAcceleration=0;
function frame(now){
 const dt=Math.min(.05,(now-previous)/1000||.016);previous=now;elapsed+=dt;
 if(!visible||document.hidden){running=false;return}
 if(!dragging){if(reduce){position=target;velocity=0}else{const a=(target-position)*42-velocity*11.6;velocity+=a*dt;position+=velocity*dt}}
 sound.update(velocity,position,dt);
 const instantaneous=(velocity-priorVelocity)/dt;priorVelocity=velocity;
 filteredAcceleration+=(Math.max(-85,Math.min(85,instantaneous))-filteredAcceleration)*(1-Math.exp(-dt*9));
 let moving=dragging||Math.abs(position-target)>.00015||Math.abs(velocity)>.001;
 for(const g of garments){
  const d=wrap(g.index-position),ad=Math.abs(d),x=Math.sign(d)*slot(ad);
  railPosition(x,g.root.position);const tangent=railPosition(x+.005,tmpA).sub(railPosition(x-.005,tmpB)).normalize();{const vx=camera.position.x-g.root.position.x,vz=camera.position.z-g.root.position.z,yaw=Math.atan2(vx,vz),n0=Math.cos(yaw),n2=-Math.sin(yaw);g.hook.quaternion.setFromAxisAngle(yAxis,yaw);g.hookStretch=1/Math.max(.3,Math.abs(tangent.x*n0+tangent.z*n2))}
  const opacity=1-smoothstep(currentEdgeStart,currentEdgeEnd,Math.abs(x));g.root.visible=opacity>.004;g.opacity=opacity;
  const viewYaw=Math.atan2(camera.position.x-x,camera.position.z-g.root.position.z);
  const chosen=frontIndex===g.index&&Math.abs(d)<.7;g.selection+=((chosen?1:0)-g.selection)*(reduce?1:1-Math.exp(-dt*6));const sideYaw=-(.48+.58*Math.min(ad,1.15));const aim=chosen?0:sideYaw;
  g.yaw+=(aim-g.yaw)*(reduce?1:1-Math.exp(-7.5*dt));
  const next=pendulumStep(g.angle,g.angularVelocity,filteredAcceleration*(.88+.12*Math.cos(g.phase)),elapsed,g.phase,dt,velocity);
  g.angle=reduce?0:next.angle;g.angularVelocity=reduce?0:next.speed;
  const swingAxis=tmpAxis.set(-tangent.z,0,tangent.x).normalize();const tf=railTaper(x);g.hook.scale.set(tf,tf,tf*Math.min(3,g.hookStretch||1));{const top=-.17*tf+.012,bottom=-.2025,len=Math.max(.02,top-bottom);g.coupling.scale.y=len/.065;g.coupling.position.y=(top+bottom)/2}g.sway.quaternion.setFromAxisAngle(swingAxis,g.angle);g.sway.scale.setScalar((ad<=1?1.12-.1*ad:1.02-.05*Math.min(ad-1,2))*(1+.06*g.selection));g.pivot.rotation.set(-.19*g.selection,viewYaw+g.yaw,0);
  moving ||= Math.abs(g.yaw-aim)>.0005||Math.abs(g.angle)>.0001||Math.abs(g.angularVelocity)>.0005||Math.abs(g.selection-(chosen?1:0))>.0005;
  if(g.cloth&&g.root.visible){
   const arr=g.cloth.geometry.attributes.position.array,base=g.cloth.userData.base,half=arr.length/2;
   const wanted=reduce?0:Math.min(.025,Math.abs(velocity)*.006+Math.abs(g.angularVelocity)*.13);
   g.flex+=(wanted-g.flex)*(1-Math.exp(-dt*3));moving ||= Math.abs(g.flex-wanted)>.00005;
   for(let k=0;k<half;k+=3){const v=Math.max(0,(-base[k+1]-.19)/3.55),drop=smoothstep(.16,1,v);const displacement=Math.sin(base[k]*2.1+elapsed*1.7-g.phase)*g.flex*drop*drop;arr[k+2]=base[k+2]+displacement;arr[k+half+2]=base[k+half+2]+displacement}
   g.cloth.geometry.attributes.position.needsUpdate=true;
  }
 }
 if(current()!==active)updateInfo();renderScene();
 if(moving)requestAnimationFrame(frame);else running=false;
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();function pick(e){const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);if(frontIndex>=0&&garments[frontIndex]?.loaded&&raycaster.intersectObject(garments[frontIndex].cloth).length)return frontIndex;const hit=raycaster.intersectObjects(garments.filter(g=>g.loaded&&g.opacity>.004).map(g=>g.cloth));if(hit.length)return hit[0].object.userData.index;return null}
host.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;gesture=false;travel=0;dragStart=lastX=e.clientX;lastY=e.clientY;lastStamp=e.timeStamp;grabVelocity=0;velocity=0;target=position;wake()});host.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX;travel=Math.max(travel,Math.abs(e.clientX-dragStart));if(!gesture&&Math.abs(e.clientY-lastY)>travel+10){release(false);return}if(travel>6){gesture=true;host.setPointerCapture(e.pointerId);host.classList.add('dragging');frontIndex=-1;let px=host.clientWidth<650?100:145;position-=dx/px;target=position;grabVelocity=dx/Math.max(1,e.timeStamp-lastStamp);velocity=-grabVelocity*1000/px;wake()}lastX=e.clientX;lastStamp=e.timeStamp});
function release(inertia=true){if(!dragging)return;dragging=false;host.classList.remove('dragging');target=Math.round(position+(inertia&&gesture?Math.max(-1.7,Math.min(1.7,velocity*.15)):0));grabVelocity=0;wake()}
host.addEventListener('pointerup',e=>{const was=gesture;release();if(!was&&travel<7){const i=pick(e);if(i===null)return;if(i!==active){target=position+wrap(i-position);frontIndex=i}else if(frontIndex===i){openDetail()}else frontIndex=i;wake()}});host.addEventListener('pointercancel',()=>release(false));window.addEventListener('pointerup',()=>release());
function step(d){frontIndex=-1;target=Math.round(target)+d;wake()}$('#prev').onclick=()=>step(-1);$('#next').onclick=()=>step(1);host.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();step(e.key==='ArrowRight'?1:-1)}if(e.key==='Enter'||e.key===' '){e.preventDefault();if(frontIndex===active)openDetail();else{frontIndex=active;wake()}}});
let wheelTimer;host.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)<Math.abs(e.deltaY))return;e.preventDefault();frontIndex=-1;target+=Math.max(-.5,Math.min(.5,e.deltaX/320));clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{target=Math.round(target);wake()},140);wake()},{passive:false});
let keyboardNavigation=false;document.addEventListener('keydown',e=>{if(!e.metaKey&&!e.ctrlKey&&!e.altKey){keyboardNavigation=true;if(document.activeElement===host)host.classList.add('keyboard-focus')}});document.addEventListener('pointerdown',()=>{keyboardNavigation=false;host.classList.remove('keyboard-focus')},true);initShop({onClose(){if(keyboardNavigation){host.classList.add('keyboard-focus');host.focus({preventScroll:true})}else{host.classList.remove('keyboard-focus');$('#detail').focus({preventScroll:true})}}});
function openDetail(){openSheet(active)}$('#detail').onclick=openDetail;
new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)wake()}).observe(host);document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake()});renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').classList.remove('hidden');$('#loading p').textContent='Rendering interrupted. Reload the page.'});updateInfo();resize();

{const un=()=>sound.unlock();['pointerdown','pointerup','keydown','click','touchend'].forEach(t=>window.addEventListener(t,un,{passive:true}));
 const b=document.querySelector('.vsr-sound');if(b){const paint=()=>{const m=!sound.isActive();b.setAttribute('aria-pressed',String(!m));b.setAttribute('aria-label',m?'Turn rail sound on':'Turn rail sound off');b.classList.toggle('off',m)};paint();sound.onState(paint);b.addEventListener('click',()=>{if(sound.isMuted()||!sound.isRunning()){sound.setMuted(false);sound.unlock();sound.ping()}else sound.setMuted(true);paint()})}}
