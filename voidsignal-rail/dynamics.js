export const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function clothDepth(x,v,distance){
 const edge=1-Math.exp(-distance/4.2);
 const body=.68+.32*smoothstep(.17,.49,v);
 const depth=(.115+.04*Math.cos(x*2.8))*body*edge;
 const folds=(Math.sin(x*8+v*2.3)*.009+Math.sin(x*15-v*4)*.004)*edge*smoothstep(.03,.36,v);
 return {depth,folds};
}
export function pendulumStep(angle,speed,acceleration,time,phase,dt,motion=0){
 const rest=.006*Math.sin(time*.68+phase)+.002*Math.sin(time*1.07+phase*1.7);
 const force=Math.max(-75,Math.min(75,acceleration))*.075;
 const dragLag=Math.max(-.06,Math.min(.06,motion*.018));
 const nextSpeed=speed+((rest+dragLag-angle)*10.5-speed*2.2+force)*dt;
 return {angle:Math.max(-.14,Math.min(.14,angle+nextSpeed*dt)),speed:nextSpeed};
}
export const collarY=x=>-.405-.165*Math.sqrt(Math.max(0,1-(x/.36)**2));
export const loopVisibility=d=>1-smoothstep(3.45,4.42,Math.abs(d));

export const EDGE_START=3.45*1.62,EDGE_END=4.42*1.62;
