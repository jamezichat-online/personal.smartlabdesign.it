import * as THREE from './vendor/three.module.js';

// Screen-space glass samples the live scene before any DOM text is drawn.
// Controls remain native HTML; only their optical backing is rendered here.
export function createGlassCompositor(renderer,cinema){
 const count=24,rects=Array.from({length:count},()=>new THREE.Vector4()),params=Array.from({length:count},()=>new THREE.Vector4());
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:target.texture},resolution:{value:new THREE.Vector2(1,1)},pointer:{value:new THREE.Vector2(-1000,-1000)},cinema,rects:{value:rects},params:{value:params},count:{value:0}},
 vertexShader:'varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 screenUv;uniform sampler2D source;uniform vec2 resolution;uniform vec2 pointer;uniform float cinema;uniform vec4 rects[24];uniform vec4 params[24];uniform int count;
 float roundBox(vec2 p,vec2 halfSize,float radius){vec2 q=abs(p)-halfSize+radius;return min(max(q.x,q.y),0.)+length(max(q,0.))-radius;}
 vec3 sceneAt(vec2 p){return texture2D(source,clamp(p/resolution,vec2(.001),vec2(.999))).rgb;}
 vec3 diffuseScene(vec2 p,float radius){vec3 c=sceneAt(p)*.20;c+=(sceneAt(p+vec2(radius,0.))+sceneAt(p-vec2(radius,0.))+sceneAt(p+vec2(0.,radius))+sceneAt(p-vec2(0.,radius)))*.12;c+=(sceneAt(p+vec2(radius,radius)*.72)+sceneAt(p+vec2(-radius,radius)*.72)+sceneAt(p+vec2(radius,-radius)*.72)+sceneAt(p-vec2(radius,radius)*.72))*.08;return c;}
 void main(){vec2 pixel=screenUv*resolution;vec3 color=sceneAt(pixel);
 for(int i=0;i<24;i++){
  if(i>=count)break;
  vec4 rect=rects[i],optics=params[i];vec2 local=pixel-rect.xy;float d=roundBox(local,rect.zw,optics.x);
  if(d>1.)continue;
  float coverage=1.-smoothstep(-.7,.7,d);float interior=max(0.,-d);
  vec2 normal=normalize(vec2(roundBox(local+vec2(.5,0.),rect.zw,optics.x)-roundBox(local-vec2(.5,0.),rect.zw,optics.x),roundBox(local+vec2(0.,.5),rect.zw,optics.x)-roundBox(local-vec2(0.,.5),rect.zw,optics.x))+vec2(.00001));
  float shoulder=exp(-interior/7.);vec2 bend=-normal*shoulder*optics.z;
  // A continuous bevel, with zero offset at the centre and no repeated images.
  vec3 transmitted=diffuseScene(pixel+bend,optics.y);
  vec3 tint=mix(vec3(.72,.77,.84),vec3(.06,.08,.115),cinema);
  float luminance=dot(transmitted,vec3(.2126,.7152,.0722));
  float tintAmount=mix(.16,.27+.17*smoothstep(.35,1.2,luminance),cinema);
  vec3 glass=mix(transmitted,tint,tintAmount);
  // The control inherits some of the larger panel beneath it.
  if(optics.w>.5)glass=mix(glass,color,.22);
  float edge=exp(-interior/1.05);vec2 lightDirection=normalize(vec2(-.65,.9));
  vec2 toPointer=pointer-pixel;float pointerLight=exp(-dot(toPointer,toPointer)/26000.);
  float bevelLight=pow(max(dot(normal,lightDirection),0.),2.);
  glass+=vec3(.62,.73,.9)*edge*(.07+.24*bevelLight+.12*pointerLight);
  glass+=vec3(.09,.11,.14)*exp(-interior/4.)*bevelLight;
  glass*=1.-.10*edge*max(dot(normal,-lightDirection),0.);
  color=mix(color,glass,coverage);
 }
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 let viewportHeight=1;
 function measure(){
  const nodes=[document.querySelector('header'),document.querySelector('footer'),...document.querySelectorAll('button,.range')].filter(Boolean);
  let n=0;
  for(const element of nodes){const r=element.getBoundingClientRect();if(r.width===0||r.height===0||n===count)continue;
   const panel=element.tagName==='HEADER'||element.tagName==='FOOTER';const radius=Math.min(parseFloat(getComputedStyle(element).borderRadius)||24,r.width/2,r.height/2);
   rects[n].set(r.x+r.width/2,viewportHeight-r.y-r.height/2,r.width/2,r.height/2);
   params[n].set(radius,panel?7:2.4,panel?4.0:5.0,panel?0:1);n++;
  }material.uniforms.count.value=n;
  const footer=document.querySelector('footer');if(footer)document.documentElement.style.setProperty('--footer-height',footer.getBoundingClientRect().height+'px');
 }
 const observer=new ResizeObserver(measure);document.querySelectorAll('header,footer,button,.range').forEach(node=>observer.observe(node));
 window.addEventListener('pointermove',e=>material.uniforms.pointer.value.set(e.clientX,viewportHeight-e.clientY),{passive:true});
 document.addEventListener('pointerleave',()=>material.uniforms.pointer.value.set(-1000,-1000));
 document.fonts?.ready.then(measure);
 document.body.classList.add('webgl-glass');
 return {target,resize(pixelWidth,pixelHeight,width,height){target.setSize(pixelWidth,pixelHeight);viewportHeight=height;material.uniforms.resolution.value.set(width,height);measure();},measure,render(){renderer.setRenderTarget(null);renderer.render(scene,camera);}};
}
