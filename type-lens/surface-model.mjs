export function projectQuad(points,u,v){
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=points;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 const den=dx1*dy2-dx2*dy1;
 const g=Math.abs(den)<1e-12?0:(dx3*dy2-dx2*dy3)/den,h=Math.abs(den)<1e-12?0:(dx1*dy3-dx3*dy1)/den;
 const z=g*u+h*v+1;
 return [((x1-x0+g*x1)*u+(x3-x0+h*x3)*v+x0)/z,((y1-y0+g*y1)*u+(y3-y0+h*y3)*v+y0)/z];
}
