import * as THREE from './vendor/three.module.js';

export function createDepthOfField(renderer,source,camera,panels){
 source.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source:{value:source.texture},depthMap:{value:source.depthTexture},near:{value:camera.near},far:{value:camera.far},focus:{value:12},strength:{value:1},resolution:{value:new THREE.Vector2(1,1)}},
 vertexShader:'varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 uvScreen;uniform sampler2D source;uniform sampler2D depthMap;uniform float near;uniform float far;uniform float focus;uniform float strength;uniform vec2 resolution;
 float distanceAt(vec2 uv){float d=texture2D(depthMap,uv).x;return near*far/(far-d*(far-near));}
 void main(){vec4 sharp=texture2D(source,uvScreen);float distance=distanceAt(uvScreen);
 if(distance>far*.95||sharp.a<.001){gl_FragColor=sharp;return;}
 // Keep the nearest portion sharp; limit the far circle of confusion to 2.4 CSS px.
 float radius=min(2.4,max(0.,distance-focus-.20)*strength);
 if(radius<.08){gl_FragColor=sharp;return;}
 vec4 sum=sharp;float weights=1.;
 for(int i=0;i<24;i++){float t=(float(i)+.5)/24.;float angle=float(i)*2.39996323;vec2 offset=vec2(cos(angle),sin(angle))*sqrt(t)*radius/resolution;vec2 uv=clamp(uvScreen+offset,vec2(.0001),vec2(.9999));float sampleDistance=distanceAt(uv);
 // Depth rejection prevents bright silhouettes bleeding over sharp foreground edges.
 float weight=exp(-t*1.5)*(1.-smoothstep(.25,.8,abs(sampleDistance-distance)));vec4 sampleColor=texture2D(source,uv);weight*=step(.001,sampleColor.a);sum+=sampleColor*weight;weights+=weight;}
 gl_FragColor=sum/weights;
 }`});
 const scene=new THREE.Scene(),cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 const point=new THREE.Vector3();
 return {target,resize(width,height,cssWidth,cssHeight){target.setSize(width,height);material.uniforms.resolution.value.set(cssWidth,cssHeight);},render(){
  camera.updateMatrixWorld();let nearest=Infinity,farthest=0;
  for(const panel of panels){panel.updateWorldMatrix(true,false);if(!panel.geometry.boundingBox)panel.geometry.computeBoundingBox();const b=panel.geometry.boundingBox;
   for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){point.set(x,y,z).applyMatrix4(panel.matrixWorld).applyMatrix4(camera.matrixWorldInverse);const distance=-point.z;if(distance>camera.near){nearest=Math.min(nearest,distance);farthest=Math.max(farthest,distance);}}
  }
  material.uniforms.focus.value=Number.isFinite(nearest)?nearest+Math.min(.35,(farthest-nearest)*.12):camera.position.z;
  material.uniforms.strength.value=1.1*12/Math.max(5,camera.position.z);
  renderer.setRenderTarget(target);renderer.render(scene,cam);
 }};
}
