/* GPU rasterization for touch devices. Physics and object coordinates stay in the studio. */
window.createMaterialRaster=function({stage,view,invalidate}){
 const layer=document.createElement('canvas'),vapour=document.createElement('canvas');
 layer.className='material-raster';vapour.className='material-vapour';
 for(const canvas of [layer,vapour]){canvas.style.pointerEvents='none';canvas.style.display='none';canvas.setAttribute('aria-hidden','true');stage.append(canvas);}
 const gl=layer.getContext('webgl2',{alpha:true,antialias:false,depth:true,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 if(!gl){layer.remove();vapour.remove();return null;}
 const vertex=`#version 300 es
 precision highp float;
 layout(location=0) in vec3 position;
 layout(location=1) in vec3 surface;
 layout(location=2) in vec3 detail;
 layout(location=3) in vec4 patty;
 layout(location=4) in float shade;
 uniform vec2 resolution;
 out vec3 vSurface,vDetail;
 out vec4 vPatty;
 out float vShade;
 void main(){
  gl_Position=vec4(position.x/resolution.x*2.-1.,1.-position.y/resolution.y*2.,-position.z/8.,1.);
  vSurface=surface;vDetail=detail;vPatty=patty;vShade=shade;
 }`;
 const fragment=`#version 300 es
 precision highp float;
 precision highp int;
 in vec3 vSurface,vDetail;
 in vec4 vPatty;
 in float vShade;
 out vec4 color;
 uniform int material,subject;
 uniform bool backPass;
 uniform vec2 resolution;
 uniform sampler2D albedo,backgroundMap,backMap;
 uniform vec3 eye;
 uniform vec4 camera;
 uniform vec3 lightDirection[3],lightRight[3],lightUp[3];
 uniform vec2 lightSize[3];
 uniform float lightPower[3];
 uniform float cameraScale,sear,heat;
 vec4 packDepth(float v){
  vec4 p=fract(v*vec4(1.,255.,65025.,16581375.));
  p-=p.yzww*vec4(1./255.,1./255.,1./255.,0.);return p;
 }
 float unpackDepth(vec4 p){return dot(p,vec4(1.,1./255.,1./65025.,1./16581375.));}
 float softbox(int i,vec3 reflected){
  if(dot(reflected,lightDirection[i])<.48)return 0.;
  vec2 d=vec2(dot(reflected,lightRight[i]),dot(reflected,lightUp[i]))/lightSize[i];
  vec2 d2=d*d;return lightPower[i]*exp(-3.5*dot(d2,d2));
 }
 float hash(ivec2 p){
  uint n=(uint(p.x)*374761393u)^(uint(p.y)*668265263u);
  n=(n^(n>>13u))*1274126177u;return float(n^(n>>16u))/4294967296.;
 }
 float noise(vec2 p){
  ivec2 i=ivec2(floor(p));vec2 f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+ivec2(1,0)),f.x),mix(hash(i+ivec2(0,1)),hash(i+ivec2(1,1)),f.x),f.y);
 }
 void main(){
  if(backPass){color=packDepth(gl_FragCoord.z);return;}
  float lit=vSurface.x*vShade,shine=vSurface.y;
  vec3 rgb;
  if(material==6){
   float back=unpackDepth(texture(backMap,gl_FragCoord.xy/resolution));
   float thickness=clamp(16.*(back-gl_FragCoord.z),.045,1.55);
   vec3 n=normalize(vSurface);float facing=max(0.,dot(n,eye));float rim=pow(1.-facing,4.1);
   vec3 reflected=2.*facing*n-eye;
   float core=softbox(0,reflected),boxes=core+softbox(1,reflected)+softbox(2,reflected);
   shine=subject==1?boxes*(.76+.18*rim)+.085*core*core:boxes*(.88+.43*rim)+.11*core*core+.07*rim;
   lit=vDetail.x;
   vec2 offset=vec2(n.x*camera.x-n.z*camera.y,n.y*camera.z-(n.x*camera.y+n.z*camera.x)*camera.w)*cameraScale*.24*thickness;
   vec3 bg=texture(backgroundMap,clamp((gl_FragCoord.xy+offset)/resolution,vec2(0.),vec2(1.))).rgb*255.;
   float red=exp(-thickness*.34),green=pow(red,7.),blue=pow(red,9.);
   if(subject==1){
    float glow=exp(-thickness*2.5)*max(0.,dot(n,lightDirection[1]))*.55;
    float transmitted=.96-.12*rim;
    rgb=vec3(70.,8.,12.)*lit+(bg+vec3(46.,22.,10.))*vec3(red,green,blue)*transmitted+vec3(22.,9.,3.)*glow;
    if(boxes>.008){float grain=noise(vDetail.yz*99.)-.5;float amount=clamp(cameraScale/145.,.25,1.);shine=shine*(1.+amount*.65*grain)+amount*.95*sqrt(core)*max(0.,grain);}
   }else{
    float amber=exp(-thickness*.64);
    rgb=vec3(97.,48.,5.)*lit+(bg+vec3(122.,83.,16.))*vec3(red*.80,amber*.92,pow(amber,3.)*.70);
   }
   lit=1.;
  }else if(material==2){rgb=vec3(238.,229.,205.);}
  else{
   rgb=texture(albedo,vec2(vSurface.z,vDetail.x)).rgb*255.;
   if(material==7){
    float wetness=.46+1.08*smoothstep(74.,135.,rgb.r)+heat*.16;
    vec2 spec=vPatty.zw*wetness;
    rgb*=vec3(1.-.20*sear,1.-.23*sear,1.-.25*sear)*(vec3(.30,.29,.29)+.82*vPatty.x*vec3(1.,.79,.56)+.72*vPatty.y*vec3(.92,.97,1.));
    rgb+=255.*(spec.x*vec3(1.,.79,.56)+spec.y*vec3(.92,.97,1.));lit=1.;shine=0.;
   }else if(material==1){shine+=.035*clamp((rgb.g-96.)/106.,0.,1.);rgb.gb+=vec2(.018,.013)*rgb.r;}
  }
  color=vec4(clamp((rgb*lit+shine*vec3(255.,240.,221.))/255.,0.,1.),1.);
 }`;
 function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 let program;
 try{program=gl.createProgram();const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}
 catch(error){console.warn('Mobile GPU renderer unavailable; using compatibility renderer.',error);layer.remove();vapour.remove();return null;}
 // Bloom stays on the GPU: no full-frame canvas readback during a gesture.
 const screenVertex=`#version 300 es
 void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;
 const screenFragment=`#version 300 es
 precision highp float;
 out vec4 color;
 uniform sampler2D sceneMap,photoMap;
 uniform vec2 resolution,blurStep;
 vec3 bright(vec2 uv){vec4 p=texture(sceneMap,uv);float y=dot(p.rgb,vec3(.2126,.7152,.0722));float b=clamp((y-.565)/.353,0.,1.);return p.rgb*(.557*b*b*p.a);}
 void main(){vec2 uv=gl_FragCoord.xy/resolution;vec4 body=texture(sceneMap,uv);vec3 base=mix(texture(photoMap,uv).rgb,body.rgb,body.a);
  vec3 glow=.20*bright(uv);
  glow+=.12*(bright(uv+vec2(blurStep.x,0.))+bright(uv-vec2(blurStep.x,0.))+bright(uv+vec2(0.,blurStep.y))+bright(uv-vec2(0.,blurStep.y)));
  glow+=.08*(bright(uv+blurStep)+bright(uv-blurStep)+bright(uv+vec2(blurStep.x,-blurStep.y))+bright(uv+vec2(-blurStep.x,blurStep.y)));
  color=vec4(1.-(1.-base)*(1.-glow),1.);
 }`;
 let screenProgram;
 try{screenProgram=gl.createProgram();for(const [type,source] of [[gl.VERTEX_SHADER,screenVertex],[gl.FRAGMENT_SHADER,screenFragment]]){const s=compile(type,source);gl.attachShader(screenProgram,s);gl.deleteShader(s);}gl.linkProgram(screenProgram);if(!gl.getProgramParameter(screenProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(screenProgram));}
 catch(error){console.warn('Mobile postprocessing unavailable; using compatibility renderer.',error);layer.remove();vapour.remove();return null;}
 const screenUniforms=Object.fromEntries(['sceneMap','photoMap','resolution','blurStep'].map(n=>[n,gl.getUniformLocation(screenProgram,n)]));
 const screenVao=gl.createVertexArray();
 const names=['resolution','material','subject','backPass','albedo','backgroundMap','backMap','eye','camera','cameraScale','sear','heat','lightDirection[0]','lightRight[0]','lightUp[0]','lightSize[0]','lightPower[0]'];
 const u=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,n)]));
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 const vertices=gl.createBuffer(),indices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
 let offset=0;[3,3,3,4,1].forEach((size,i)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,56,offset*4);offset+=size;});
 const aniso=gl.getExtension('EXT_texture_filter_anisotropic');
 function texture(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;}
 const front=texture(),frontFbo=gl.createFramebuffer();
 const bg=texture(),back=texture(),backFbo=gl.createFramebuffer(),depth=gl.createRenderbuffer();
 const textures=new Map(),buffers=new WeakMap();let w=0,h=0,visible=false,latest=[],ready=true;
 let vertexData=new Float32Array(0),indexData=new Uint32Array(0);
 function resize(width,height){
  if(w===width&&h===height)return;
  w=layer.width=vapour.width=width;h=layer.height=vapour.height=height;
  gl.bindTexture(gl.TEXTURE_2D,back);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);
  gl.bindFramebuffer(gl.FRAMEBUFFER,backFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,back,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete thickness framebuffer');
  gl.bindTexture(gl.TEXTURE_2D,front);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.bindFramebuffer(gl.FRAMEBUFFER,frontFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,front,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete color framebuffer');
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 }
 function albedo(mat,mips){
  if(textures.has(mat))return textures.get(mat);
  const t=texture(),{data,width,height}=mips[0];
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB8,width,height,0,gl.RGB,gl.UNSIGNED_BYTE,bytes);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  textures.set(mat,t);return t;
 }
 function render(prepared,objects,camera,lights,mips,subject,sear,heat){
  if(!ready)return false;
  resize(view.width,view.height);latest=[];
  const groups=new Map();
  prepared.forEach((parts,i)=>parts.forEach(part=>{const mat=part.mesh.mat;if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push({...part,id:objects[i].id,shade:objects[i].shade});latest.push({...part,id:objects[i].id});}));
  let count=0,faces=0;for(const group of groups.values())for(const p of group){count+=p.arr.length;faces+=p.mesh.tri.length;}
  if(vertexData.length<count*14)vertexData=new Float32Array(count*14);
  if(indexData.length<faces*3)indexData=new Uint32Array(faces*3);
  const batches=[];let vi=0,ii=0;
  for(const [mat,group] of groups){const start=ii;for(const {mesh,arr,shade} of group){
   const base=vi/14;
   for(const p of arr){vertexData[vi++]=p[0];vertexData[vi++]=p[1];vertexData[vi++]=p[2];vertexData[vi++]=p[3];vertexData[vi++]=p[4];vertexData[vi++]=p[5];vertexData[vi++]=p[6];vertexData[vi++]=p[7]||0;vertexData[vi++]=p[8]||0;vertexData[vi++]=p[10]||0;vertexData[vi++]=p[11]||0;vertexData[vi++]=p[12]||0;vertexData[vi++]=p[13]||0;vertexData[vi++]=shade;}
   let cached=buffers.get(mesh);if(!cached){cached=new Uint32Array(mesh.tri.length*3);mesh.tri.forEach((f,i)=>cached.set(f.slice(0,3),i*3));buffers.set(mesh,cached);}
   for(let j=0;j<cached.length;j++)indexData[ii++]=base+cached[j];
  }batches.push({mat,start,count:ii-start});}
  gl.useProgram(program);gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,vertexData.subarray(0,vi),gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indexData.subarray(0,ii),gl.DYNAMIC_DRAW);
  gl.viewport(0,0,w,h);gl.uniform2f(u.resolution,w,h);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
  gl.uniform1i(u.backPass,true);for(let unit=0;unit<3;unit++){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,bg);}gl.bindFramebuffer(gl.FRAMEBUFFER,backFbo);gl.clearColor(1,0,0,0);gl.clearDepth(0);gl.depthFunc(gl.GREATER);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  for(const b of batches)if(b.mat===6)gl.drawElements(gl.TRIANGLES,b.count,gl.UNSIGNED_INT,b.start*4);
  gl.bindFramebuffer(gl.FRAMEBUFFER,frontFbo);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.depthFunc(gl.LESS);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1i(u.backPass,false);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,bg);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,view);gl.uniform1i(u.backgroundMap,1);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,back);gl.uniform1i(u.backMap,2);
  gl.uniform3fv(u.eye,camera.eye);gl.uniform4f(u.camera,camera.cy,camera.sy,camera.ce,camera.se);gl.uniform1f(u.cameraScale,camera.s);gl.uniform1i(u.subject,subject==='bear'?1:2);gl.uniform1f(u.sear,sear);gl.uniform1f(u.heat,heat);
  for(const [key,field] of [['lightDirection','direction'],['lightRight','right'],['lightUp','up']])gl.uniform3fv(u[key+'[0]'],new Float32Array(lights.flatMap(x=>x[field])));
  gl.uniform2fv(u['lightSize[0]'],new Float32Array(lights.flatMap(x=>x.size)));gl.uniform1fv(u['lightPower[0]'],new Float32Array(lights.map(x=>x.power)));
  for(const b of batches){gl.uniform1i(u.material,b.mat);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mips[b.mat]?albedo(b.mat,mips[b.mat]):bg);gl.uniform1i(u.albedo,0);gl.drawElements(gl.TRIANGLES,b.count,gl.UNSIGNED_INT,b.start*4);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);gl.useProgram(screenProgram);gl.bindVertexArray(screenVao);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,front);gl.uniform1i(screenUniforms.sceneMap,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,bg);gl.uniform1i(screenUniforms.photoMap,1);
  gl.uniform2f(screenUniforms.resolution,w,h);gl.uniform2f(screenUniforms.blurStep,7/Math.max(1,view.clientWidth),7/Math.max(1,view.clientHeight));gl.drawArrays(gl.TRIANGLES,0,3);
  visible=true;layer.style.display=vapour.style.display='block';return true;
 }
 function hit(x,y){
  let result=null,z=-Infinity;
  for(const {mesh,arr,id} of latest)for(const f of mesh.tri){
   const a=arr[f[0]],b=arr[f[1]],c=arr[f[2]],dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1],area=dx*ey-dy*ex;
   if(Math.abs(area)<.001)continue;
   const u=((x-a[0])*ey-(y-a[1])*ex)/area,v=(dx*(y-a[1])-dy*(x-a[0]))/area,t=1-u-v;
   if(Math.min(u,v,t)<0)continue;
   const d=t*a[2]+u*b[2]+v*c[2];if(d>z){z=d;result={id,depth:z};}
  }
  return result;
 }
 const fog=vapour.getContext('2d');
 layer.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;visible=false;layer.style.display=vapour.style.display='none';invalidate();});
 return {get ready(){return ready;},get visible(){return visible;},render,hit,
  vapour:callback=>{fog.clearRect(0,0,w,h);callback(fog);},
  hide(){visible=false;latest=[];layer.style.display=vapour.style.display='none';}
 };
};
