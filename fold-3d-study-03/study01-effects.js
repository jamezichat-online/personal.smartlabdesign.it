// Direct port of the approved STUDY 01 v12 faceEffects/transitionSurface.
// Distances retain the original 314 × 440 coordinate system.
export const study01EffectsGLSL = `
vec2 study01Field(float localU,vec2 imagePoint,float edgeX,float opening,bool front){
 float W=314.,H=440.,D=1065.;
 float a=opening*3.141592653589793;
 float sine=max(0.,sin(a));
 if(sine<.001)return vec2(0.);
 float grazing=pow(sine,.82);
 float u=clamp(localU,0.,W);
 float scale=D/(D-u*sine);
 float sideDistance=W-u;
 float side=1.-smoothstep(0.,192.,sideDistance);
 float gap=max(0.,H*.5-abs(imagePoint.y));
 float rim=1.-smoothstep(0.,max(.001,14.*grazing),gap);
 float left=front?0.:max(-W,edgeX);
 float right=front?min(W,edgeX):0.;
 float width=max(0.,right-left),center=left+width*.5;
 float radius=min((front?imagePoint.x>=center:imagePoint.x<center)?25.:0.,width*.45);
 vec2 q=abs(imagePoint-vec2(center,0.))-vec2(width*.5-radius,H*.5-radius);
 float apertureDistance=radius-length(max(q,vec2(0.)))-min(max(q.x,q.y),0.);
 float aperture=1.-smoothstep(0.,.8+10.*grazing,max(0.,apertureDistance));
 float sideBlur=clamp(1.12*grazing*side*scale,0.,1.);
 float blur=1.-(1.-sideBlur)*(1.-.62*grazing*max(rim,aperture)*(front?1.:side));
 float sideShadow=clamp(.97*grazing*pow(side,.72),0.,1.);
 float shadow=1.-(1.-sideShadow)*(1.-aperture*(front?1.:side));
 return vec2(blur,shadow);
}
`;
