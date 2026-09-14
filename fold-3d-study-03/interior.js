import * as THREE from './vendor/three.module.js';

// Visual reconstruction from the supplied interior reference, not a manufacturing BOM.
export function createInterior({left,right,hingeGroup,shape,solid,screens}){
 function partShape(x0,x1,y0,y1,rl,rr){
  const s=new THREE.Shape();rl=Math.min(rl,(y1-y0)/2,(x1-x0)/2);rr=Math.min(rr,(y1-y0)/2,(x1-x0)/2);
  s.moveTo(x0+rl,y0);s.lineTo(x1-rr,y0);s.quadraticCurveTo(x1,y0,x1,y0+rr);s.lineTo(x1,y1-rr);s.quadraticCurveTo(x1,y1,x1-rr,y1);s.lineTo(x0+rl,y1);s.quadraticCurveTo(x0,y1,x0,y1-rl);s.lineTo(x0,y0+rl);s.quadraticCurveTo(x0,y0,x0+rl,y0);return s;
 }
 function partSolid(outline,depth,bevel,material){return new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:6}),material);}
 const parts=[];let amount=0,target=0,transparency=0;
 const metal=new THREE.MeshStandardMaterial({color:0xa8aba9,metalness:.92,roughness:.28});
 const darkMetal=new THREE.MeshStandardMaterial({color:0x343b40,metalness:.8,roughness:.35});
 const pouch=new THREE.MeshStandardMaterial({color:0x17191a,metalness:.18,roughness:.61});
 const pcb=new THREE.MeshStandardMaterial({color:0x142923,metalness:.22,roughness:.55});
 const shield=new THREE.MeshStandardMaterial({color:0x777f7d,metalness:.95,roughness:.32});
 const silicon=new THREE.MeshStandardMaterial({color:0x0c1115,metalness:.35,roughness:.3});
 const copper=new THREE.MeshStandardMaterial({color:0xb88b42,metalness:.88,roughness:.35});
 const flex=new THREE.MeshStandardMaterial({color:0x8b541f,metalness:.3,roughness:.54,side:THREE.DoubleSide});
 const rubber=new THREE.MeshStandardMaterial({color:0x0a0c0d,roughness:.8});
 const ceramic=new THREE.MeshStandardMaterial({color:0x9c9886,metalness:.12,roughness:.65});
 const axis=new THREE.Vector3(0,1,0);
 function register(object,name,travel){
  object.name=name;object.userData.component=true;
  parts.push({object,home:object.position.clone(),travel:new THREE.Vector3(...travel)});
  return object;
 }
 function panel(parent,name,x,y,width,height,z,thickness,material,lift,radius=.035){
  const object=partSolid(partShape(-width/2,width/2,-height/2,height/2,radius,radius),thickness,.004,material);
  object.position.set(x,y,z-thickness/2);parent.add(object);
  register(object,name,[x*.035,y*.025,lift]);return object;
 }
 function group(parent,name,x,y,z,lift){
  const object=new THREE.Group();object.position.set(x,y,z);parent.add(object);
  register(object,name,[x*.035,y*.025,lift]);return object;
 }
 function line(parent,points,material,radius=.006){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const object=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,points.length*6),radius,6,false),material);parent.add(object);return object;
 }
 function disc(parent,x,y,z,radius,depth,material){
  const object=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,32),material);
  object.rotation.x=Math.PI/2;object.position.set(x,y,z);parent.add(object);return object;
 }
 function label(parent,text,x,y,z,width,height,color='#9fa5a5'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,128);ctx.fillStyle=color;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 38px monospace';ctx.fillText(text,256,64);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const object=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
  object.position.set(x,y,z);parent.add(object);return object;
 }
 function screw(parent,x,y,z,index,lift=1.40){
  const fastener=group(parent,'Vite '+index,x,y,z,lift);
  disc(fastener,0,0,0,.029,.017,metal);disc(fastener,0,0,.009,.010,.002,silicon);
  for(const angle of [0,Math.PI/2]){const slot=new THREE.Mesh(new THREE.BoxGeometry(.034,.006,.002),silicon);slot.rotation.z=angle;slot.position.z=.010;fastener.add(slot);}
  return fastener;
 }
 // Keep existing exterior pieces independent in the exploded assembly.
 for(const parent of [left,right])for(const object of [...parent.children]){
  if(!object.isMesh||screens.includes(object)||object.name==='housing-frame')continue;
  let lift=object.position.z<-.10?-.75-Math.abs(object.position.z+.14)*2.3:.05;
  if(object.name==='display-bezel')lift=1.75;
  register(object,object.name||'Componente esterno',[object.position.x*.06,object.position.y*.04,lift]);
 }
 for(const object of hingeGroup.children)if(object.isMesh)register(object,'Carter cerniera',[0,0,-.28]);
 screens.forEach((object,i)=>register(object,i===2?'Display esterno':'Display interno '+(i===0?'destro':'sinistro'),[0,0,i===2?-1.55:1.8]));

 // Two separate graphite heat spreaders and support plates below the electronics.
 for(const [parent,sign] of [[left,-1],[right,1]]){
  panel(parent,'Piastra di supporto',sign*1.59,0,2.66,3.92,-.111,.018,darkMetal,-.26,.22);
  panel(parent,'Diffusore termico in grafite',sign*1.64,-.18,2.48,3.34,-.092,.006,pouch,.12,.12);
 }
 function battery(parent,name,x,y,width,height){
  const pack=group(parent,name,x,y,-.050,.62);
  const foil=partSolid(partShape(-width/2,width/2,-height/2,height/2,.065,.065),.045,.007,metal);foil.position.z=-.025;pack.add(foil);
  const wrap=partSolid(partShape(-width/2+.012,width/2-.012,-height/2+.014,height/2-.014,.053,.053),.047,.004,pouch);wrap.position.z=-.023;pack.add(wrap);
  for(const yy of [-height/2+.026,height/2-.026])line(pack,[[-width/2+.08,yy,.029],[width/2-.08,yy,.029]],darkMetal,.003);
  label(pack,'Li-ion  /  '+name,0,-height*.22,.030,width*.67,.11);
  label(pack,'FOLD 03  ·  CELL ASSEMBLY',0,-height*.28,.030,width*.65,.08);
  const tab=panel(parent,name+' · contatto',x+.18,y+height/2+.055,.19,.11,-.023,.006,copper,.83,.012);
  return pack;
 }
 battery(left,'CELLA A',-1.70,-.09,2.26,2.99);
 battery(right,'CELLA B',2.23,-.40,1.30,2.97);

 // Left acoustic / power assemblies above and below the large cell.
 function speaker(parent,x,y,width,name){
  const g=group(parent,name,x,y,-.031,.89);
  const box=partSolid(partShape(-width/2,width/2,-.145,.145,.095,.095),.046,.005,silicon);box.position.z=-.025;g.add(box);
  const surround=new THREE.Mesh(new THREE.TorusGeometry(.085,.010,8,40),metal);surround.scale.x=width*2.8;surround.position.z=.026;g.add(surround);
  for(let i=0;i<18;i++)line(g,[[(-.42+i*.049)*width,-.072,.031],[(-.42+i*.049)*width,.072,.031]],darkMetal,.003);
  return g;
 }
 speaker(left,-1.66,1.72,1.16,'Modulo acustico superiore');
 speaker(left,-1.90,-1.83,.82,'Modulo altoparlante inferiore');
 speaker(right,2.14,-1.99,.84,'Modulo altoparlante destro');
 panel(left,'Attuatore aptico',-2.56,1.74,.47,.30,-.032,.048,darkMetal,.77,.035);
 panel(left,'Scheda alimentazione',-.73,1.73,.68,.30,-.052,.022,pcb,.68);
 panel(left,'Scheda USB e microfoni',-1.02,-1.87,1.01,.24,-.034,.022,pcb,.73);
 panel(right,'Scheda USB-C',.87,-1.94,.93,.29,-.036,.024,pcb,.78);

 // Irregular main logic board beside the right cell; the reference's A20 plate
 // is modeled as a removable package, not painted onto the whole interior.
 const board=group(right,'Scheda logica',.82,.20,-.051,.80);
 const outline=new THREE.Shape();outline.moveTo(-.47,-1.54);outline.lineTo(.39,-1.54);outline.lineTo(.56,-1.33);outline.lineTo(.56,1.58);outline.lineTo(.15,1.76);outline.lineTo(-.47,1.76);outline.closePath();
 const boardMesh=partSolid(outline,.018,.004,pcb);boardMesh.position.z=-.01;board.add(boardMesh);
 for(let i=0;i<15;i++){
  const y=-1.34+i*.19;
  line(board,[[-.41,y,.014],[-.29,y,.014],[-.22,y+.07,.014],[.31,y+.07,.014],[.44,y+.12,.014]],copper,.0028);
 }
 const chip=panel(board,'SoC · package',.10,-.28,.56,.60,.037,.038,silicon,.32,.018);
 const lid=new THREE.Mesh(new THREE.BoxGeometry(.50,.54,.008),metal);lid.position.set(0,0,.043);chip.add(lid);
 label(chip,'A20 PRO',0,0,.048,.41,.13,'#202a2b');
 const shieldSpecs=[[-.19,1.29,.39,.62],[.16,.73,.53,.41],[-.17,-.93,.42,.55],[.15,-1.26,.39,.27]];
 for(const [x,y,width,height] of shieldSpecs){
  const cap=panel(board,'Schermatura EMI',x,y,width,height,.034,.023,shield,.49,.018);
  for(const sx of [-1,1])for(const sy of [-1,1])disc(cap,sx*(width/2-.043),sy*(height/2-.043),.028,.009,.002,silicon);
 }
 for(let i=0;i<26;i++){
  const x=i%2?-.37:.41,y=-1.31+Math.floor(i/2)*.223;
  panel(board,'Componente SMD '+(i+1),x,y,.065,.095,.023,.012,i%3?ceramic:silicon,.23+(i%3)*.035,.005);
 }
 for(let i=0;i<6;i++){
  const conn=panel(right,'Connettore flex '+(i+1),.35+i*.185,1.92,.11,.075,-.016,.014,silicon,1.04,.006);
  for(let j=0;j<4;j++)disc(conn,-.037+j*.024,0,.019,.004,.003,copper);
 }
 // Camera modules and contact details sit beneath the externally modeled lenses.
 for(const [x,y,r] of [[2.54,1.52,.25],[1.82,1.55,.22]]){
  const g=group(right,'Modulo fotocamera interno',x,y,-.039,.92);
  const housing=partSolid(partShape(-.29,.29,-.29,.29,.065,.065),.062,.006,silicon);housing.position.z=-.033;g.add(housing);
  disc(g,0,0,.034,r,.016,darkMetal);disc(g,0,0,.045,r*.66,.008,silicon);disc(g,0,0,.052,r*.23,.004,metal);
 }
 panel(right,'Schermatura RF',1.47,1.68,.39,.60,-.022,.034,pouch,.93,.022);

 // Flexible ribbons carry traces between boards and the hinge; no photo plane.
 function ribbon(parent,name,points,width,lift){
  const g=group(parent,name,0,0,0,lift);
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const pos=[],idx=[];
  for(let i=0;i<=32;i++){const t=i/32,p=path.getPoint(t),tangent=path.getTangent(t);const side=new THREE.Vector3(-tangent.y,tangent.x,0).normalize().multiplyScalar(width/2);for(const sign of [-1,1]){const v=p.clone().addScaledVector(side,sign);pos.push(v.x,v.y,v.z);}if(i<32){const n=i*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,flex));
  for(const offset of [-.025,0,.025])line(g,points.map(p=>[p[0],p[1]+offset,p[2]+.002]),copper,.002);
 }
 ribbon(left,'Flex batteria A',[[-1.4,1.45,-.026],[-1.13,1.61,-.015],[-.45,1.56,-.024],[-.20,1.18,-.026]],.10,.98);
 ribbon(right,'Flex batteria B',[[2.22,1.11,-.027],[1.82,1.05,-.017],[1.19,.85,-.020]],.09,1.10);
 ribbon(left,'Flex interconnessione sinistra',[[-.35,-1.78,-.020],[-.18,-1.38,-.024],[-.16,.88,-.023]],.12,1.09);
 ribbon(right,'Flex interconnessione destra',[[.35,-1.75,-.017],[.19,-1.34,-.025],[.19,.83,-.023]],.12,1.13);

 // Symmetric hinge modules: machined leaves, shafts, springs and cable guides.
 for(const [parent,sign] of [[left,-1],[right,1]]){
  const x=sign*.145;
  for(const y of [-1.78,-1.21,.83,1.47]){
   panel(parent,'Flangia cerniera',x,y,.21,.40,-.013,.026,metal,.42,.020);
   for(const yy of [y-.125,y+.125])screw(parent,x,yy,.012,'cerniera',1.20);
  }
  const guide=panel(parent,'Guida cavi cerniera',sign*.132,-.27,.105,1.25,-.004,.032,rubber,.47,.022);
  for(const y of [-1.42,1.13]){
   const assembly=group(parent,'Albero e molla cerniera',sign*.039,y,.003,.58);
   const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.41,24),darkMetal);assembly.add(shaft);
   const points=[];for(let k=0;k<=192;k++){const t=k/192;points.push([Math.cos(t*Math.PI*20)*.034,-.15+t*.30,Math.sin(t*Math.PI*20)*.034]);}
   line(assembly,points,metal,.008);
  }
 }
 let screwIndex=0;
 for(const [parent,sign] of [[left,-1],[right,1]]){
  for(const y of [-1.95,-1.46,-.84,0,.83,1.46,1.97])screw(parent,sign*2.95,y,.009,++screwIndex);
  for(const x of [.47,1.08,1.75,2.44])for(const y of [-2.06,2.06])screw(parent,sign*x,y,.011,++screwIndex);
 }
 // Microphone ports, contacts and lower brackets finish the perimeter.
 for(const [parent,sign] of [[left,-1],[right,1]]){
  panel(parent,'Staffa inferiore',sign*2.61,-1.91,.34,.28,-.012,.015,shield,.96,.03);
  for(let i=0;i<5;i++)panel(parent,'Contatto antenna',sign*(.53+i*.24),2.04,.08,.05,-.018,.009,copper,.71,.004);
  const mic=group(parent,'Microfono',sign*.48,-2.00,-.015,.99);disc(mic,0,0,0,.051,.035,metal);disc(mic,0,0,.019,.018,.004,rubber);
 }

 // Fine parts do not cast expensive, unstable subpixel self-shadows.
 for(const part of parts)if(part.object.userData.component)part.object.traverse(o=>{if(o.isMesh&&!screens.includes(o)){o.castShadow=false;o.receiveShadow=false;}});
 function setTransparency(percent){
  transparency=THREE.MathUtils.clamp(percent,0,100)/100;
  for(const mesh of screens){mesh.material.uniforms.displayOpacity.value=1-transparency;mesh.material.transparent=transparency>0;mesh.material.depthWrite=transparency===0;mesh.visible=transparency<1;mesh.material.needsUpdate=true;}
 }
 function update(dt){
  amount+= (target-amount)*(1-Math.exp(-dt*5));if(Math.abs(target-amount)<.0001)amount=target;
  const eased=amount*amount*(3-2*amount);
  for(const part of parts)part.object.position.copy(part.home).addScaledVector(part.travel,eased);
  screens.forEach(mesh=>mesh.material.uniforms.exploded.value=eased);
  return amount;
 }
 setTransparency(0);
 return {parts,componentCount:parts.length,setTransparency,setExploded(value){target=value?1:0;},update,get exploded(){return target===1;},get amount(){return amount;},get transparency(){return transparency;}};
}
