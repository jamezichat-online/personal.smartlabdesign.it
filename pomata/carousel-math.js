(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PomataOrbit=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const mod=(value,count)=>((value%count)+count)%count;
  function pose(index,phase,count,width,height){
    const angle=count<=1?0:(index-phase)*Math.PI*2/count;
    const depth=(1-Math.cos(angle))/2;
    const scale=1.13/(1+depth*1.45);
    const radius=width*(width<650?.67:.35);
    const x=Math.sin(angle)*radius*scale;
    const y=-depth*Math.min(height*.22,115);
    // Smoothstep removes the far arc without a hard visibility cut.
    const fade=clamp((depth-.43)/.35,0,1);
    const visibility=1-fade*fade*(3-2*fade);
    return {x,y,depth,scale,shadowY:y,blur:Math.pow(depth,.7)*6.4,
      opacity:(1-depth*.39)*visibility,
      shadowOpacity:(.82-depth*.30)*visibility,z:Math.round((1-depth)*1000)+1};
  }
  function nearestTarget(phase,index,count){
    if(count<=1)return 0;
    return index+Math.round((phase-index)/count)*count;
  }
  function releaseTarget(phase,velocity,count){
    if(count<=1)return 0;
    return clamp(Math.round(phase+clamp(velocity,-6,6)*.24),Math.ceil(phase-2),Math.floor(phase+2));
  }
  function settle(phase,velocity,target,dt){
    const omega=12,displacement=phase-target,term=velocity+omega*displacement;
    const decay=Math.exp(-omega*dt);
    return {phase:target+(displacement+term*dt)*decay,
      velocity:(velocity-omega*term*dt)*decay};
  }
  return {pose,nearestTarget,releaseTarget,settle,mod,clamp};
});
