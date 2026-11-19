(function(root){
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function smooth(current,target,dt,tau=.065){return current+(target-current)*(-Math.expm1(-Math.max(0,dt)/tau))}
function stepView(current,target,dt){let z=Math.exp(smooth(Math.log(current.z),Math.log(target.z),dt,.055));return {z:Math.abs(z-target.z)<.00002?target.z:z,x:Math.abs(current.x-target.x)<.02?target.x:smooth(current.x,target.x,dt,.055),y:Math.abs(current.y-target.y)<.02?target.y:smooth(current.y,target.y,dt,.055)}}
function shutter(previous,current,dt,width,height,enabled=true){if(!enabled||dt<=0||dt>.1)return {x:0,y:0};let dx=current.x-previous.x,dy=current.y-previous.y,zoom=Math.log(current.z/previous.z),speed=Math.hypot(dx,dy)/dt+Math.abs(zoom)/dt*Math.hypot(width,height)*.22;if(speed<90)return {x:0,y:0};const scale=.009/dt,zoomBlur=Math.abs(zoom)*Math.min(width,height)*.22;return {x:clamp(Math.abs(dx)*scale+zoomBlur,0,9),y:clamp(Math.abs(dy)*scale+zoomBlur,0,9)}}
const api={smooth,stepView,shutter};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FloralMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
