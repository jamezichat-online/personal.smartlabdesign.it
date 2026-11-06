export const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function clothDepth(x,v,distance){
 const edge=1-Math.exp(-distance/4.2);
 const body=.68+.32*smoothstep(.17,.49,v);
 const depth=(.115+.04*Math.cos(x*2.8))*body*edge;
 const folds=(Math.sin(x*8+v*2.3)*.009+Math.sin(x*15-v*4)*.004)*edge*smoothstep(.03,.36,v);
 return {depth,folds};
}
export function pendulumStep(angle,speed,acceleration,time,phase,dt,motion=0){
 // Translational acceleration drives a pendulum in the rail's lateral/gravity plane.
 // There is no idle oscillator and no speed-dependent lean at constant velocity.
 const torque=Math.max(-45,Math.min(45,acceleration))*.15;
 let nextSpeed=speed+(-11.5*Math.sin(angle)-2.3*speed+torque)*dt;
 let nextAngle=angle+nextSpeed*dt;
 const limit=.17;
 if(Math.abs(nextAngle)>limit){nextAngle=Math.sign(nextAngle)*limit;if(Math.sign(nextSpeed)===Math.sign(nextAngle))nextSpeed*=.2;}
 return {angle:nextAngle,speed:nextSpeed};
}
export const collarY=x=>-.405-.165*Math.sqrt(Math.max(0,1-(x/.36)**2));
export const loopVisibility=d=>1-smoothstep(3.45,4.42,Math.abs(d));

export const EDGE_START=7.4,EDGE_END=9.4;
