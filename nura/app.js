import * as THREE from './three.module.js';

const $ = id => document.getElementById(id);
const canvas=$('world');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#a1c6c7');
scene.fog=new THREE.Fog('#a1c6c7',19,46);
const camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.06,110);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1:1.35));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const hemi=new THREE.HemisphereLight(0xe9f9ff,0x637552,2.45);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe6b5,3.2);
sun.position.set(-5,12,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-19;sun.shadow.camera.right=19;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;
sun.shadow.camera.near=.1;sun.shadow.camera.far=35;sun.shadow.bias=-.0004;scene.add(sun);
const fill=new THREE.DirectionalLight(0x93a9ff,.85);fill.position.set(6,5,-8);scene.add(fill);
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=THREE.MathUtils.clamp;
const mix=THREE.MathUtils.lerp;
let seed=42831;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const R=(lo,hi)=>lo+(hi-lo)*rand();
const mat=(c,rough=.9,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
const moss=mat('#678c54'),grass=mat('#85a96a'),grass2=mat('#759a60'),stone=mat('#d4c8a6'),stoneSide=mat('#a79e8b'),stoneEdge=mat('#e7d7b7'),trunk=mat('#77664a');
const obstacleMeshes=[],surfacePatches=[],rocks=[],anchors=[],hash=new Map();
const HASH=.32;
const cell=v=>Math.floor(v/HASH);
const key=(x,y,z)=>x+','+y+','+z;
function box(x,y,z,w,h,d,m,collision=true){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  if(collision)obstacleMeshes.push(mesh);
  return mesh;
}
function surface(origin,u,v,w,h,name){
  const n=new THREE.Vector3().crossVectors(u,v).normalize();
  if((name==='GROUND'||name==='STAIRS'||name==='ROOF')&&n.y<-.5)n.negate();
  if(name==='CEILING'&&n.y>.5)n.negate();
  surfacePatches.push({origin:origin.clone(),u:u.clone(),v:v.clone(),w,h,n,name});
}
function addAnchor(p,n,kind){
  const ix=cell(p.x),iy=cell(p.y),iz=cell(p.z);
  for(let x=ix-1;x<=ix+1;x++)for(let y=iy-1;y<=iy+1;y++)for(let z=iz-1;z<=iz+1;z++)
    for(const a of hash.get(key(x,y,z))||[])if(a.p.distanceToSquared(p)<.27*.27)return false;
  const item={p:p.clone(),n:n.clone(),kind,id:anchors.length};
  anchors.push(item);
  const k=key(ix,iy,iz);if(!hash.has(k))hash.set(k,[]);hash.get(k).push(item);
  return true;
}
function queryAnchors(p,r){
  const out=[];const x0=cell(p.x-r),x1=cell(p.x+r),y0=cell(p.y-r),y1=cell(p.y+r),z0=cell(p.z-r),z1=cell(p.z+r),r2=r*r;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)
    for(const a of hash.get(key(x,y,z))||[])if(a.p.distanceToSquared(p)<r2)out.push(a);
  return out;
}
// Every collider face is authored as a world-space surface. Traversal only sees these anchors.
box(-2.8,-.17,0,12,.3,10,grass,false);
surface(V(-3.0,.01,0),V(1,0,0),V(0,0,1),11.7,9.4,'GROUND');
box(7.3,-.17,0,8.6,.3,10,grass,false);
surface(V(7.3,.01,0),V(1,0,0),V(0,0,1),8.4,9.4,'GROUND');
for(let i=0;i<3;i++){
  const x=-2.1+i*.69,h=.22+i*.22;
  box(x,h/2,-.05,.72,h,3.2,stone,true);
  surface(V(x,h+.012,-.05),V(1,0,0),V(0,0,1),.70,3.15,'STAIRS');
  surface(V(x+.36,h/2,-.05),V(0,1,0),V(0,0,1),h,3.1,'STAIRS');
}
box(1.15,.35,-.06,1.85,.7,3.25,stone,true);
surface(V(1.15,.716,-.06),V(1,0,0),V(0,0,1),1.83,3.22,'STAIRS');
// Tall face and underside are sampled with exactly the same surface rule.
box(2.26,1.48,0,.5,2.96,4.15,stoneSide,true);
surface(V(1.995,1.48,0),V(0,0,1),V(0,1,0),4.12,2.94,'WALL');
surface(V(2.53,1.48,0),V(0,1,0),V(0,0,1),2.94,4.12,'WALL');
box(3.9,3.16,0,3.85,.42,4.15,stone,true);
surface(V(3.9,3.382,0),V(1,0,0),V(0,0,1),3.8,4.1,'ROOF');
surface(V(3.9,2.936,0),V(0,0,1),V(1,0,0),4.1,3.8,'CEILING');
surface(V(5.82,3.15,0),V(0,1,0),V(0,0,1),.41,4.12,'EDGE');
for(let i=0;i<10;i++){
  const x=R(-7.5,10.5),z=R(-4.7,4.7);
  if(Math.abs(z)<1.8&&x>-3&&x<6.4)continue;
  const s=R(.2,.62);
  const m=new THREE.Mesh(new THREE.DodecahedronGeometry(s,1),mat(i%2?'#a5b1a0':'#a7a891'));
  m.position.set(x,s*.36,z);m.scale.y=.62;m.rotation.set(R(0,1),R(0,3),R(0,2));
  m.castShadow=true;m.receiveShadow=true;scene.add(m);obstacleMeshes.push(m);
  rocks.push({m,r:s});
}
for(const p of surfacePatches){
  const nu=Math.max(1,Math.floor(p.w/.25)),nv=Math.max(1,Math.floor(p.h/.25));
  const points=[];for(let i=0;i<nu;i++)for(let j=0;j<nv;j++)points.push([i,j]);
  for(let i=points.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[points[i],points[j]]=[points[j],points[i]];}
  for(const [i,j] of points){
    const a=(i+.5+R(-.35,.35))/nu-.5,b=(j+.5+R(-.35,.35))/nv-.5;
    const pos=p.origin.clone().addScaledVector(p.u,a*p.w).addScaledVector(p.v,b*p.h);
    addAnchor(pos,p.n,p.name);
  }
}
// Irregular rocks: shoot a ray from outside toward each collider and use the actual hit normal.
const raycaster=new THREE.Raycaster();
for(const {m,r} of rocks)for(let i=0;i<110;i++){
  const dir=V(R(-1,1),R(-.45,1),R(-1,1)).normalize();
  const from=m.position.clone().addScaledVector(dir,r*3);
  raycaster.set(from,dir.clone().negate());
  const hit=raycaster.intersectObject(m,false)[0];
  if(hit&&hit.face){
    const n=hit.face.normal.clone().transformDirection(m.matrixWorld).normalize();
    addAnchor(hit.point.clone().addScaledVector(n,.008),n,'ROCK');
  }
}
// Trunk and stylized canopy: geometry is environmental, not part of navigation.
for(let i=0;i<17;i++){
  const x=R(-8,10.5),z=-R(3.1,7);
  const h=R(1.1,2.1);
  const t=new THREE.Mesh(new THREE.CylinderGeometry(.1,.16,h,7),trunk);
  t.position.set(x,h/2,z);t.castShadow=true;scene.add(t);
  const canopy=new THREE.Mesh(new THREE.IcosahedronGeometry(R(.65,1.1),1),mat(rand()<.5?'#3e7f59':'#638e48'));
  canopy.position.set(x,h+.4,z);canopy.scale.set(1.15,.83,1.08);canopy.castShadow=true;scene.add(canopy);
}
for(let i=0;i<190;i++){
  const x=R(-8,11),z=R(-4.8,4.8);
  if(Math.abs(z)<1.5&&x>-2.4&&x<5.9)continue;
  const g=new THREE.Mesh(new THREE.ConeGeometry(R(.025,.045),R(.13,.34),3),mat(rand()<.5?'#afd18a':'#6b9357'));
  g.position.set(x,.095,z);g.rotation.z=R(-.38,.38);scene.add(g);
}
// Masonry seams in the playable obstacle; a clear visual language for gripable edges.
const seamMat=new THREE.LineBasicMaterial({color:0x8b9182,transparent:true,opacity:.36});
function line(a,b){
  const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),seamMat);scene.add(o);
}
for(let y=.34;y<2.92;y+=.37)line(V(1.723,y,-2.07),V(1.723,y,2.07));
for(let z=-2;z<=2;z+=.56)for(let y=.15;y<2.86;y+=.74)line(V(1.727,y,z),V(1.727,Math.min(2.94,y+.36),z));
for(let x=2.2;x<5.8;x+=.43){line(V(x,3.39,-2.05),V(x,3.39,2.05));line(V(x,2.936,-2.05),V(x,2.936,2.05));}
for(let z=-2;z<2.1;z+=.45){line(V(2.2,3.39,z),V(5.8,3.39,z));line(V(2.2,2.936,z),V(5.8,2.936,z));}
// Stone props for grounding.
for(let i=0;i<9;i++){
  const x=R(-7.1,9),z=(rand()<.5?-1:1)*R(2.2,4.1);
  if(x>2&&x<6)continue;
  box(x,.12,z,R(.22,.44),R(.18,.33),R(.26,.46),rand()<.5?stone:stoneSide,false);
}
// Oil pools are animated opaque dark liquids. Their absorption is tied to gripped endpoints.
const poolVert=String.raw`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const poolFrag=String.raw`uniform float uTime;uniform float uFill;varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float r=length(p);float w=sin(12.*r-uTime*3.)*.006+sin(atan(p.y,p.x)*7.+uTime)*.012;float edge=1.-smoothstep(.88+w,1.+w,r);if(edge<.01||uFill<.005)discard;vec3 col=mix(vec3(.015,.025,.045),vec3(.067,.085,.11),smoothstep(.15,.9,r));float sheen=pow(max(0.,sin(p.x*6.+p.y*3.-uTime*1.7)),12.)*.26;float ring=pow(max(0.,sin(r*30.-uTime*2.7)),24.)*.28;col+=vec3(.23,.25,.35)*(ring+sheen);col+=vec3(.16,.05,.18)*(1.-r)*.2;gl_FragColor=vec4(col,edge*.98);}`;
const pools=[
  {pos:V(-4.18,.035,-.42),radius:1.13,growth:1},
  {pos:V(.77,.735,.26),radius:.75,growth:2},
  {pos:V(3.55,3.398,.14),radius:.79,growth:3},
  {pos:V(5.95,1.26,-.85),radius:.7,growth:4,barrel:true}
];
for(const p of pools){
  p.fill=1;p.drinking=false;p.drinkTime=0;p.used=false;
  p.uniforms={uTime:{value:0},uFill:{value:1}};
  const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,90),new THREE.ShaderMaterial({vertexShader:poolVert,fragmentShader:poolFrag,uniforms:p.uniforms,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.copy(p.pos);mesh.scale.set(p.radius,p.radius,p.radius);
  scene.add(mesh);p.mesh=mesh;
}
const barrel= new THREE.Group();barrel.position.set(5.95,0,-.85);scene.add(barrel);
{
  const drum=mat('#b35e36',.53,.28),rim=mat('#343e40',.3,.7);
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,1.08,32,1,true),drum);
  shell.position.y=.65;shell.castShadow=true;shell.receiveShadow=true;barrel.add(shell);obstacleMeshes.push(shell);
  for(const y of [.19,.93,1.2]){
    const edge=new THREE.Mesh(new THREE.TorusGeometry(.7,.045,8,44),rim);
    edge.rotation.x=Math.PI/2;edge.position.y=y;barrel.add(edge);
  }
  const bottom=new THREE.Mesh(new THREE.CylinderGeometry(.695,.695,.03,32),rim);bottom.position.y=.16;barrel.add(bottom);
  const p=pools[3];p.pos.y=1.23;p.mesh.position.y=1.23;
  for(let i=0;i<40;i++){
    const a=i*Math.PI*2/40,pt=V(5.95+Math.cos(a)*.68,1.22,-.85+Math.sin(a)*.68);
    addAnchor(pt,V(Math.cos(a),.25,Math.sin(a)).normalize(),'BARREL');
  }
}
// Distance-sampled black liquid. Each tendril's capsule chain uses min internally;
// the capsule chain and body are blended using smin near the root.
const MAX=40,SAMPLES=17,STEPS=11,stages=[8,12,18,26,40],gripTargets=[4,6,9,12,16];
const ropeData=new Float32Array(MAX*SAMPLES*4);
const ropeTexture=new THREE.DataTexture(ropeData,SAMPLES,MAX,THREE.RGBAFormat,THREE.FloatType);
ropeTexture.magFilter=THREE.NearestFilter;ropeTexture.minFilter=THREE.NearestFilter;ropeTexture.generateMipmaps=false;ropeTexture.needsUpdate=true;
const sdfVert=String.raw`out vec3 vWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const sdfFrag=String.raw`precision highp float;precision highp sampler2D;
uniform mat4 projectionMatrix;
uniform sampler2D uRopes;uniform vec3 uBody;uniform float uIndex;uniform float uSize;uniform float uTime;uniform vec3 uDrop;uniform float uDropSize;
in vec3 vWorld;out vec4 fragColor;
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float sphere(vec3 p,vec3 c,float r){return length(p-c)-r;}
float cap(vec3 p,vec3 a,vec3 b,float ra,float rb){vec3 ba=b-a;float h=clamp(dot(p-a,ba)/max(dot(ba,ba),.000001),0.,1.);return length(p-a-ba*h)-mix(ra,rb,h);}
float bodySDF(vec3 p){
  float w=sin(uTime*2.1+p.y*7.)*.011;
  float d=sphere(p,vec3(0.,.03,0.),uSize*.88+w);
  d=smin(d,sphere(p,vec3(-uSize*.28,-.08,-uSize*.13),uSize*.72),.19);
  d=smin(d,sphere(p,vec3(uSize*.17,-uSize*.10,uSize*.23),uSize*.73),.18);
  d=smin(d,sphere(p,vec3(-uSize*.04,uSize*.17,-uSize*.14),uSize*.74),.2);
  return d;
}
float ropeSDF(vec3 p){
 int index=int(uIndex)-1;float d=100.;
 for(int j=0;j<16;j++){
    vec4 a=texelFetch(uRopes,ivec2(j,index),0),b=texelFetch(uRopes,ivec2(j+1,index),0);
    if(a.w<.001&&b.w<.001)continue;
    d=min(d,cap(p,a.xyz,b.xyz,max(.001,a.w),max(.001,b.w)));
 }
 // Only blend into the body near the root, not across every segment.
 if(length(p)<uSize+0.29)d=smin(d,bodySDF(p),.105);
 if(uDropSize>.001)d=smin(d,sphere(p,uDrop,uDropSize),.095);
 return d;
}
float sd(vec3 p){return uIndex<.5?bodySDF(p):ropeSDF(p);}
vec3 normalAt(vec3 p){
  vec2 e=vec2(.0045,0.);
  return normalize(vec3(sd(p+e.xyy)-sd(p-e.xyy),sd(p+e.yxy)-sd(p-e.yxy),sd(p+e.yyx)-sd(p-e.yyx)));
}
void main(){
 vec3 rd=normalize(vWorld-cameraPosition);
 float t=max(0.,length(vWorld-cameraPosition)-.03);
 float far=t+5.5;bool hit=false;vec3 p;
 for(int k=0;k<51;k++){
   p=cameraPosition+rd*t-uBody;
   float d=sd(p);
   if(d<.0028){hit=true;break;}
   t+=clamp(d*.87,.008,.22);
   if(t>far)break;
 }
 if(!hit)discard;
 vec3 N=normalAt(p);
 vec3 R=reflect(rd,N),L=normalize(vec3(-.42,.81,.41));
 float fres=pow(1.-clamp(dot(-rd,N),0.,1.),2.15);
 vec3 sky=mix(vec3(.12,.19,.24),vec3(.57,.76,.83),smoothstep(-.3,.8,R.y));
 sky=mix(vec3(.36,.33,.22),sky,smoothstep(-.19,.12,R.y));
 float skyBand=smoothstep(-.06,.08,R.y)-smoothstep(.37,.66,R.y);
 vec3 oil=vec3(.009,.013,.021);
 oil+=sky*.47*pow(max(dot(R,normalize(vec3(-.24,.7,.42))),0.),1.6);
 oil+=skyBand*vec3(.19,.25,.28)*.45;
 float hard=pow(max(dot(reflect(-L,N),-rd),0.),110.);
 float secondary=pow(max(dot(reflect(-normalize(vec3(.8,.45,-.3)),N),-rd),0.),37.);
 oil+=vec3(1.,.97,.84)*hard*2.45+vec3(.48,.56,.85)*secondary*.27;
 float film=sin(12.*fres+atan(N.z,N.x)*2.5+uTime*.28);
 oil+=fres*.12*vec3(.5+.5*film,.45+.4*sin(film*2.2+1.),.65+.3*sin(film*1.4+2.));
 oil+=pow(fres,2.)*vec3(.34,.22,.74)*.67;
 oil*=1.-smoothstep(.83,1.,fres)*.28;
 vec3 worldHit=p+uBody;
 vec4 clip=projectionMatrix*viewMatrix*vec4(worldHit,1.);
 gl_FragDepth=clamp(clip.z/clip.w*.5+.5,0.,1.);
 fragColor=vec4(oil,1.);
}`;
const baseUniforms={
  uRopes:{value:ropeTexture},uBody:{value:V()},uIndex:{value:0},uSize:{value:.35},uTime:{value:0},uDrop:{value:V(100,100,100)},uDropSize:{value:0}
};
function liquidMaterial(index){
  const u={};for(const [k,v] of Object.entries(baseUniforms))u[k]={value:v.value};
  u.uIndex={value:index};
  return new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:sdfVert,fragmentShader:sdfFrag,uniforms:u,transparent:true,depthWrite:true,depthTest:true,side:THREE.FrontSide});
}
const liquidGeo=new THREE.SphereGeometry(1,26,18);
const bodyMesh=new THREE.Mesh(liquidGeo,liquidMaterial(0));bodyMesh.renderOrder=5;scene.add(bodyMesh);
const ropeMeshes=[];
for(let i=0;i<MAX;i++){
  const mesh=new THREE.Mesh(liquidGeo,liquidMaterial(i+1));
  mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=6+i*.0001;scene.add(mesh);ropeMeshes.push(mesh);
}
const eyeMat=new THREE.MeshBasicMaterial({color:0xedffb0});
const eyes=[];
for(const k of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.038,12,8),eyeMat);scene.add(eye);eyes.push(eye);}
const eyeGlow=new THREE.PointLight(0xdafcbd,.42,1.7);scene.add(eyeGlow);
const shadowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;let x=c.getContext('2d');let g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#08180daa');g.addColorStop(.4,'#1b2e1b66');g.addColorStop(1,'#15251e00');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})();
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity:.75}));
shadow.rotation.x=-Math.PI/2;shadow.scale.set(2.1,1.6,1);scene.add(shadow);
const states={IDLE:0,REACH:1,GRIP:2,RELEASE:3};
let body=V(-5.52,.43,.0),vel=V(),stageIndex=0,autoplay=true,autoTarget=0,elapsed=0,drinkHeld=false,latchRequested=false,latchTime=0;
const keys=new Set(),stick=V(),desired=V(1,0,0),tentacles=[],worldUp=V(0,1,0);
let angle=2.30,pitch=.27,started=false,messageTimeout=0,shake=0,supported=0,lastSurface='GROUND';
for(let i=0;i<MAX;i++)tentacles.push({state:states.IDLE,time:0,target:null,points:Array.from({length:STEPS},()=>body.clone()),prev:Array.from({length:STEPS},()=>body.clone()),length:1.1,base:V(),drop:-1,long:false});
const autoPath=[
  V(-4.2,.49,-.3),V(-1.55,.7,0),V(.9,1.0,.15),V(1.84,1.05,.03),
  V(1.83,2.4,0),V(1.90,3.45,0),V(3.55,3.77,.05),
  V(5.15,3.75,.1),V(6.45,1.70,-.9),V(5.95,1.58,-.85),
  V(6.88,.48,-.5),V(8.4,.46,0),V(9.7,.43,-.7)
];
const vecTmp=V(),vecTmp2=V();
const lerpVector=(a,b,t)=>a.clone().lerp(b,t);
function tipRoot(i){
 const a=i*2.39996,b=(i%5)*.13;
 return body.clone().add(V(Math.cos(a)*(.09+.04*Math.sin(elapsed*3+b)),Math.sin(i*1.7)*.07,Math.sin(a)*.12));
}
function getSurface(){
 let best=null,score=1e9;
 for(const s of surfacePatches){
   const relative=body.clone().sub(s.origin);
   const along=relative.dot(s.n),u=relative.dot(s.u),v=relative.dot(s.v);
   if(Math.abs(u)>s.w/2+.4||Math.abs(v)>s.h/2+.4||Math.abs(along)>1.65)continue;
   let cost=Math.abs(along),pref=0;
   if(s.name==='WALL'&&body.x>1.0&&body.x<2.5&&body.y<3.23&&desired.x>.05)pref=-2.3;
   if(s.name==='ROOF'&&body.y>3.15)pref=-.7;
   if(s.name==='CEILING'&&body.y>2.1&&body.y<3.12&&body.x>2.6)pref=-.3;
   cost+=pref;
   if(cost<score){score=cost;best={s,along};}
 }
 return best;
}
function visibleAnchor(a){
 const d=a.p.clone().sub(body),len=d.length();
 if(len<.07)return false;
 raycaster.set(body,d.normalize());raycaster.far=Math.max(.02,len-.105);
 const hits=raycaster.intersectObjects(obstacleMeshes,false);
 return !hits.length||hits[0].distance>len-.11;
}
function gripCount(){let n=0;for(let i=0;i<stages[stageIndex];i++)if(tentacles[i].state===states.GRIP)n++;return n;}
function committedCount(){let n=0;for(let i=0;i<stages[stageIndex];i++)if(tentacles[i].state===states.GRIP||tentacles[i].state===states.REACH)n++;return n;}
function gripTarget(){return gripTargets[stageIndex];}
function nearestPool(){
 let result=null,min=1.52;
 for(const p of pools)if(!p.used){
   const d=Math.hypot(body.x-p.pos.x,body.z-p.pos.z,Math.max(0,Math.abs(body.y-p.pos.y)-.5));
   if(d<min){min=d;result=p;}
 }
 return result;
}
function nearPoolGrips(p){
 return tentacles.filter(t=>t.state===states.GRIP&&t.target&&t.target.p.distanceTo(p.pos)<p.radius+(.2)).length;
}
function chooseAnchor(index,pool){
 const root=tipRoot(index),radius=1.72+stageIndex*.085;
 const ideal=mix(1.08,.78,stageIndex/4);
 const candidates=queryAnchors(body,radius).filter(a=>a.p.distanceTo(root)>.26);
 const occupied=tentacles.filter(t=>t.state===states.GRIP&&t.target).map(t=>t.target.p);
 let ranked=[];
 for(const a of candidates){
   const direction=a.p.clone().sub(body),length=direction.length();
   if(length>radius||length<.2)continue;
   const nScore=clamp(a.n.dot(body.clone().sub(a.p).normalize()),-.4,1);
   if(nScore<-.18)continue;
   const tangent=direction.clone().addScaledVector(a.n,-direction.dot(a.n)).length();
   const dist=Math.abs(tangent-ideal);
   const move=direction.clone().normalize().dot(desired);
   const sep=occupied.length?Math.min(...occupied.map(p=>p.distanceTo(a.p))):.7;
   const theta=index*2.39996;
   const radial=V(Math.cos(theta),0,Math.sin(theta));
   const spread=direction.clone().setY(0).normalize().dot(radial);
   let score=(1-dist/.9)*2.4+move*.8+nScore*1.3+Math.min(sep,1.05)*2.2+spread*2.5+R(-.11,.11);
   if(sep<.36)score-=4.5;
   if(pool&&!pool.used&&a.p.distanceTo(pool.pos)<pool.radius)score+=1.6;
   ranked.push({a,score});
 }
 ranked.sort((a,b)=>b.score-a.score);
 for(const item of ranked.slice(0,24))if(visibleAnchor(item.a))return item.a;
 return null;
}
function bezier(a,b,t){
 const delta=b.clone().sub(a);
 const outward=delta.clone().setY(0);
 if(outward.lengthSq()<.0001)outward.set(1,0,0);else outward.normalize();
 const arch=.57+stageIndex*.07;
 const c1=a.clone().addScaledVector(outward,arch).add(V(0,.28,0));
 const c2=b.clone().addScaledVector(outward,arch*.30).add(V(0,.45,0));
 const q=1-t;
 return a.clone().multiplyScalar(q*q*q).addScaledVector(c1,3*q*q*t).addScaledVector(c2,3*q*t*t).addScaledVector(b,t*t*t);
}
function equalBezier(a,b){
 const poly=[];let total=0,last=a;
 for(let j=0;j<=48;j++){const pos=bezier(a,b,j/48);if(j)total+=pos.distanceTo(last);poly.push({pos,total});last=pos;}
 const out=[];
 for(let i=0;i<STEPS;i++){
   const target=total*i/(STEPS-1);
   let j=1;while(j<poly.length-1&&poly[j].total<target)j++;
   const lo=poly[j-1],hi=poly[j],f=(target-lo.total)/Math.max(.0001,hi.total-lo.total);
   out.push(lo.pos.clone().lerp(hi.pos,clamp(f,0,1)));
 }
 return out;
}
function startReach(t,index,anchor){
 t.state=states.REACH;t.time=0;t.target=anchor;t.long=false;t.length=1.76+stageIndex*.095;
 const root=tipRoot(index),curve=equalBezier(root,anchor.p);
 for(let j=0;j<STEPS;j++){t.points[j].copy(root);t.prev[j].copy(root);}
 t.curve=curve;
}
function release(t){
 if(t.state===states.IDLE||t.state===states.RELEASE)return;
 t.state=states.RELEASE;t.time=0;t.target=null;t.long=false;
}
function sampleCatmull(points,percent){
 const x=percent*(points.length-1),i=Math.min(points.length-2,Math.floor(x)),t=x-i;
 const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
 return V().addScaledVector(p1,2).addScaledVector(p2.clone().sub(p0),t)
 .addScaledVector(p0.clone().multiplyScalar(2).sub(p1.clone().multiplyScalar(5)).add(p2.clone().multiplyScalar(4)).sub(p3),t*t)
 .addScaledVector(p0.clone().negate().addScaledVector(p1,3).addScaledVector(p2,-3).add(p3),t*t*t).multiplyScalar(.5);
}
function simulateRope(t,index,dt){
 const root=tipRoot(index),end=t.target.p,points=t.points;
 const gravity=V(0,-.0015,0),curve=equalBezier(root,end);
 for(let j=1;j<STEPS-1;j++){
   const pos=points[j].clone(),velocity=pos.clone().sub(t.prev[j]).multiplyScalar(.86);
   points[j].add(velocity).add(gravity).lerp(curve[j],.17);
   t.prev[j].copy(pos);
 }
 points[0].copy(root);points[STEPS-1].copy(end);
 let arcLength=0;for(let j=0;j<STEPS-1;j++)arcLength+=curve[j].distanceTo(curve[j+1]);
 const segLen=Math.max(.07,arcLength*1.04/(STEPS-1));
 for(let pass=0;pass<5;pass++){
   for(let j=0;j<STEPS-1;j++){
     const a=points[j],b=points[j+1],d=b.clone().sub(a),len=d.length();
     if(len>segLen){const correction=d.multiplyScalar((len-segLen)/len*.53);if(j) a.add(correction);if(j+1<STEPS-1)b.sub(correction);}
   }
   points[0].copy(root);points[STEPS-1].copy(end);
 }
}
function updateTentacles(dt){
 const pool=nearestPool(),active=stages[stageIndex],count=gripCount(),target=gripTarget();
 if(count>target+2){
   const excess=tentacles.slice(0,active).filter(t=>t.state===states.GRIP&&!t.long)
      .sort((a,b)=>a.target.p.clone().sub(body).dot(desired)-b.target.p.clone().sub(body).dot(desired));
   for(let k=0;k<Math.min(count-target,excess.length);k++)release(excess[k]);
 }
 // Score every frame. Existing ropes are only released after physical constraints.
 for(let i=0;i<active;i++){
   const t=tentacles[i],root=tipRoot(i);t.time+=dt;
   if(t.state===states.IDLE){
     if(committedCount()<target+2){const a=chooseAnchor(i,pool);if(a)startReach(t,i,a);}
   }else if(t.state===states.REACH){
     const progress=clamp(t.time/(.13+stageIndex*.008),0,1);
     const endIdx=progress*(STEPS-1);
     for(let j=0;j<STEPS;j++){
       const at=Math.min(endIdx,j),low=Math.floor(at),high=Math.min(STEPS-1,low+1);
       t.points[j].copy(t.curve[low]).lerp(t.curve[high],at-low);
     }
     if(progress===1){t.state=states.GRIP;t.time=0;for(let j=0;j<STEPS;j++)t.prev[j].copy(t.points[j]);}
   }else if(t.state===states.GRIP){
     const span=body.distanceTo(t.target.p);
     const back=t.target.p.clone().sub(body).dot(desired)<-.20;
     if(t.long){
       t.length=Math.max(.64,t.length-dt*1.08);
       if(t.length<.73&&span<.78){t.long=false;release(t);vel.y+=.72;}
       else simulateRope(t,i,dt);
     }else if(span>t.length*.92||(back&&count>=target&&t.time>.12&&rand()<dt*6))release(t);
     else simulateRope(t,i,dt);
   }else if(t.state===states.RELEASE){
     const shrink=clamp(t.time/.20,0,1);
     for(let j=0;j<STEPS;j++)t.points[j].lerp(root,.13+shrink*.25);
     if(shrink===1){t.state=states.IDLE;t.time=0;}
   }
 }
 for(let i=active;i<MAX;i++)if(tentacles[i].state!==states.IDLE)release(tentacles[i]);
}
function writeRopeTexture(){
 const active=stages[stageIndex];
 for(let i=0;i<MAX;i++){
   const t=tentacles[i],mesh=ropeMeshes[i];
   if(i>=active||t.state===states.IDLE){mesh.visible=false;continue;}
   const points=t.points,ball=V(),samples=[];
   for(let j=0;j<SAMPLES;j++)samples.push(sampleCatmull(points,j/(SAMPLES-1)));
   const fade=t.state===states.RELEASE?1-clamp(t.time/.20,0,1):1;
   const radius=(.069-stageIndex*.0065)*fade;
   for(let j=0;j<SAMPLES;j++){
     const p=samples[j],k=(i*SAMPLES+j)*4;
     ropeData[k]=p.x-body.x;ropeData[k+1]=p.y-body.y;ropeData[k+2]=p.z-body.z;
     ropeData[k+3]=radius*(.3+.7*Math.sin(Math.PI*(.12+.83*j/(SAMPLES-1))))*(j===16?.63:1);
   }
   const center=V();for(const p of samples)center.add(p);center.divideScalar(samples.length);
   let extent=.12;for(const p of samples)extent=Math.max(extent,p.distanceTo(center));
   extent+=radius+.11;
   mesh.visible=true;mesh.position.copy(center);mesh.scale.setScalar(extent);
   mesh.material.uniforms.uBody.value.copy(body);
   mesh.material.uniforms.uSize.value=.345+stageIndex*.075;
   mesh.material.uniforms.uTime.value=elapsed;
   if(t.drop>=0){
     let prog=1-(t.drop%1),pt=sampleCatmull(points,prog);
     mesh.material.uniforms.uDrop.value.copy(pt).sub(body);
     mesh.material.uniforms.uDropSize.value=.075+stageIndex*.004;
   }else mesh.material.uniforms.uDropSize.value=0;
 }
 ropeTexture.needsUpdate=true;
}
function updateWater(dt){
 const near=nearestPool();
 for(const p of pools){
   p.uniforms.uTime.value=elapsed;
   if(p.used)continue;
   if(p.drinking){
     p.drinkTime+=dt;
     if(p.barrel){
       const dive=clamp(p.drinkTime/2.75,0,1);
       const oilHeight=1.43-.27*Math.sin(dive*Math.PI);
       body.lerp(V(p.pos.x,oilHeight,p.pos.z),clamp(dt*3.3,0,1));
       vel.multiplyScalar(Math.exp(-dt*7));
     }
     p.fill=clamp(1-p.drinkTime/2.75,0,1);
     p.mesh.scale.setScalar(p.radius*Math.max(.01,p.fill));
     p.uniforms.uFill.value=p.fill;
     for(let i=0;i<stages[stageIndex];i++){
       const t=tentacles[i];if(t.state===states.GRIP&&t.target&&t.target.p.distanceTo(p.pos)<p.radius+.2)t.drop=(elapsed*.65+i*.16)%1;
       else t.drop=-1;
     }
     if(p.drinkTime>=2.75){
       p.used=true;p.drinking=false;
       if(p.barrel){body.y+=.14;vel.y+=2.65;autoTarget=Math.max(autoTarget,10);}
       stageIndex=Math.min(4,stageIndex+1);shake=.3;
       message('EVOLUTION · '+stages[stageIndex]+' TENTACLES');
       for(let i=stages[stageIndex-1];i<stages[stageIndex];i++){
         const t=tentacles[i];t.state=states.IDLE;t.time=0;
       }
       for(const t of tentacles)t.drop=-1;
     }
   }else if((autoplay||drinkHeld)&&near===p&&body.distanceTo(p.pos)<1.8&&nearPoolGrips(p)>=3){
     p.drinking=true;p.drinkTime=0;message('ABSORBING BLACK WATER');
   }
 }
}
function tryDrink(){
 drinkHeld=true;const p=nearestPool();
 if(p&&nearPoolGrips(p)<3)message('黒い水に触手を3本以上接続');
 else if(!p)message('黒い水の近くで吸収');
}
function launch(){
 latchRequested=true;latchTime=.8;
 const highest=queryAnchors(body,2.3).filter(a=>a.p.y>body.y+.36).sort((a,b)=>b.p.y-a.p.y)[0];
 let slot=tentacles.slice(0,stages[stageIndex]).findIndex(t=>t.state===states.IDLE||t.state===states.RELEASE);
 if(slot<0)slot=0;
 if(highest&&visibleAnchor(highest)){startReach(tentacles[slot],slot,highest);tentacles[slot].length=2.45;tentacles[slot].long=true;vel.y+=.9;message('LONG REACH · LATCH');}
 else {vel.y+=2.2;message('LEAP');}
}
function worldMovement(dt){
 const info=getSurface(),target=gripTarget(),num=gripCount();
 supported=clamp(num/Math.max(1,target),0,1)*(info?1:.22);
 const inputX=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+stick.x;
 const inputZ=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.z;
 if(Math.abs(inputX)+Math.abs(inputZ)>.06)autoplay=false;
 if(autoplay){
   const waypoint=autoPath[Math.min(autoTarget,autoPath.length-1)];
   desired.copy(waypoint).sub(body);if(desired.length()<.95&&autoTarget<autoPath.length-1)autoTarget++;
   desired.normalize();
 }else{
   const rotation=angle-2.30;
   desired.set(inputX*Math.cos(rotation)-inputZ*Math.sin(rotation),0,inputX*Math.sin(rotation)+inputZ*Math.cos(rotation)).normalize();
 }
 if(autoplay&&autoTarget>=autoPath.length-1&&body.distanceTo(autoPath.at(-1))<.7){autoTarget=0;autoplay=false;message('EXPLORATION COMPLETE');}
 const surface=info?.s;
 if(surface){
   lastSurface=surface.name;
   const normal=surface.n;
   const dot=desired.dot(normal);
   let along=desired.clone().addScaledVector(normal,-dot);
   if(surface.name==='WALL'&&desired.x>.05){along.addScaledVector(worldUp,Math.max(.5,desired.x*1.65));if(body.y>2.86)along.x+=1.35;}
   if(surface.name==='CEILING'&&desired.y>.25)along.add(V(.4,0,0));
   if(along.length()>.01)along.normalize();
   const speed=(2.95+stageIndex*.32)*(autoplay?.80:1);
   vel.lerp(along.multiplyScalar(speed),1-Math.exp(-dt*(supported>.2?16:9)));
   const offset=mix(.40,.91,stageIndex/4);
   const error=offset-info.along;
   vel.addScaledVector(normal,clamp(error*7.2*dt,-.18,.18)*(supported*.8+.13));
   if(!autoplay&&desired.length()<.01)vel.multiplyScalar(Math.exp(-dt*17));
 }else{
   lastSurface='AIR';
   vel.x+=desired.x*dt*6;vel.z+=desired.z*dt*6;
 }
 vel.y-=9.5*(1-supported)*dt;
 const terminal=6.2;vel.y=Math.max(-terminal,vel.y);
 body.addScaledVector(vel,dt);
 // Grip ropes constrain maximum distance, without forcing a fixed length or inverting the state flow.
 for(let k=0;k<3;k++)for(let i=0;i<stages[stageIndex];i++){
   const t=tentacles[i];if(t.state!==states.GRIP||!t.target)continue;
   const displacement=body.clone().sub(t.target.p),dist=displacement.length();
   if(dist>t.length){
     body.addScaledVector(displacement,(t.length-dist)/dist*.35);
     const radial=displacement.normalize();
     const outward=vel.dot(radial);if(outward>0)vel.addScaledVector(radial,-outward*.75);
   }
 }
 // Solid geometry stops penetration; the motor projects forward push onto the wall tangent.
 if(body.y<.34){body.y=.34;if(vel.y<0)vel.y=0;}
 if(body.x>1.1&&body.x<2.6&&body.y<3.06&&Math.abs(body.z)<2.2){body.x=Math.min(body.x,1.995-(.345+stageIndex*.075)-.10);if(vel.x>0)vel.x=0;}
 if(body.x>2.4&&body.x<5.75&&body.y>2.95&&body.y<3.72){body.y=3.383+(.345+stageIndex*.075)+.09;vel.y=Math.max(0,vel.y);}
 if(body.x>5.2&&body.x<6.3&&body.y<1.1&&Math.abs(body.z+.85)<.66){body.y=Math.max(body.y,1.03);}
 if(body.x>9.8){body.x=9.8;autoplay=false;}if(body.x< -7.5)body.x=-7.5;
 if(Math.abs(body.z)>4.7)body.z=clamp(body.z,-4.7,4.7);
 if(latchTime>0){latchTime-=dt;if(latchRequested){vel.y+=.9*dt;latchRequested=false;}}
}
function updateVisual(){
 bodyMesh.position.copy(body);const size=.345+stageIndex*.075;
 bodyMesh.scale.setScalar(size*2.08);bodyMesh.material.uniforms.uBody.value.copy(body);
 bodyMesh.material.uniforms.uSize.value=size;bodyMesh.material.uniforms.uTime.value=elapsed;
 const facing=camera.position.clone().sub(body).normalize();
 const right=V().crossVectors(worldUp,facing).normalize();
 for(let i=0;i<2;i++){
   const k=i?1:-1;
   eyes[i].position.copy(body).addScaledVector(facing,size*.99).addScaledVector(right,k*size*.24).add(V(0,size*.035,0));
   eyes[i].scale.setScalar(.62+stageIndex*.07);
 }
 eyeGlow.position.copy(body);
 shadow.position.set(body.x,.015,body.z);shadow.material.opacity=clamp(1-body.y/4,.05,.55);
 shadow.scale.set(1.3+stageIndex*.3,.85+stageIndex*.2,1);
 writeRopeTexture();
}
function message(text){
 const el=$('message');el.textContent=text;el.classList.add('show');messageTimeout=elapsed+2.3;
}
function updateHUD(){
 $('count').textContent=String(stages[stageIndex]).padStart(2,'0');
 $('gripped').textContent=String(gripCount()).padStart(2,'0');
 $('surface').textContent=lastSurface;
 $('support').textContent=Math.round(supported*100)+'%';
 $('supportFill').style.width=Math.round(supported*100)+'%';
 $('stage').textContent=lastSurface==='WALL'?'ASCENT / 02':lastSurface==='CEILING'?'UNDERSIDE / 03':body.x>5.4?'QUARRY / 04':'GARDEN / 01';
 $('evolution').textContent='STAGE 0'+(stageIndex+1)+' / 05';
 $('levels').querySelectorAll('span').forEach((e,i)=>e.className=i===stageIndex?'active':i<stageIndex?'past':'');
 const p=pools.find(x=>x.drinking);
 $('progress').style.width=((stageIndex+(p?1-p.fill:0))/4*100)+'%';
 $('auto').classList.toggle('active',autoplay);
 $('auto').textContent=autoplay?'▶ AUTO':'▷ AUTO';
 if(elapsed>messageTimeout)$('message').classList.remove('show');
}
function reset(){
 body.set(-5.52,.43,0);vel.set(0,0,0);supported=1;stageIndex=0;autoTarget=0;autoplay=true;latchTime=0;elapsed=0;
 for(const p of pools){p.fill=1;p.drinking=false;p.drinkTime=0;p.used=false;p.mesh.scale.setScalar(p.radius);p.uniforms.uFill.value=1;}
 for(const t of tentacles){t.state=states.IDLE;t.target=null;t.time=0;t.drop=-1;t.long=false;}
 for(let i=0;i<8;i++){const a=chooseAnchor(i,null);if(a){startReach(tentacles[i],i,a);tentacles[i].state=states.GRIP;for(let j=0;j<STEPS;j++){tentacles[i].points[j].copy(tentacles[i].curve[j]);tentacles[i].prev[j].copy(tentacles[i].curve[j]);}}}
}
reset();
let lastTime=performance.now(),hudClock=0;
camera.position.set(-10.4,4.1,7);camera.lookAt(body);
function frame(time){
 requestAnimationFrame(frame);
 let dt=Math.min(.035,(time-lastTime)/1000||.016);lastTime=time;elapsed+=dt;
 if(started){
   worldMovement(dt);
   updateTentacles(dt);
   updateWater(dt);
 }
 updateVisual();
 for(const p of pools)p.uniforms.uTime.value=elapsed;
 const distance=innerWidth<700?5.7:6.0;
 const offset=V(Math.cos(angle)*distance,2.15+Math.sin(pitch)*distance*.32,Math.sin(angle)*distance);
 const desiredCam=body.clone().add(offset);
 if(shake>0){desiredCam.x+=R(-shake,shake)*.3;desiredCam.y+=R(-shake,shake)*.3;shake-=dt;}
 camera.position.lerp(desiredCam,1-Math.exp(-dt*12));
 camera.lookAt(body.clone().add(V(0,.29,0)));
 if((hudClock+=dt)>.13){updateHUD();hudClock=0;}
 renderer.render(scene,camera);
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1:1.35));}
window.addEventListener('resize',resize);
function beginPlay(){
 if(!started){started=true;$('intro').classList.add('hidden');}
}
window.addEventListener('keydown',e=>{
 const codes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyR'];
 if(!codes.includes(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 beginPlay();keys.add(e.code);
 if(e.code==='Space'&&!e.repeat)launch();
 if(e.code==='KeyE'&&!e.repeat)tryDrink();
 if(e.code==='KeyR'&&!e.repeat)reset();
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyE')drinkHeld=false;});
function cancelInput(){
 keys.clear();stick.set(0,0,0);drinkHeld=false;
 draggingPointer=null;stickPointer=null;
 $('knob').style.transform='translate(0,0)';
}
window.addEventListener('blur',cancelInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelInput();});
$('start').addEventListener('click',()=>{beginPlay();autoplay=true;message('FIND A GRIP · MOVE / CLIMB / ABSORB');});
$('auto').addEventListener('click',()=>{beginPlay();autoplay=!autoplay;});
$('drink').addEventListener('click',()=>{beginPlay();tryDrink();setTimeout(()=>drinkHeld=false,1100);});
$('latch').addEventListener('click',()=>{beginPlay();launch();});
$('reset').addEventListener('click',()=>{started=true;reset();});
$('mobileDrink').addEventListener('click',()=>{beginPlay();tryDrink();setTimeout(()=>drinkHeld=false,1200);});
$('mobileLatch').addEventListener('click',()=>{beginPlay();launch();});
let draggingPointer=null,prevX=0,prevY=0;
canvas.addEventListener('pointerdown',e=>{if(draggingPointer!==null)return;e.preventDefault();beginPlay();draggingPointer=e.pointerId;prevX=e.clientX;prevY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==draggingPointer)return;e.preventDefault();angle-=(e.clientX-prevX)*.007;pitch=clamp(pitch+(e.clientY-prevY)*.006,-.35,.78);prevX=e.clientX;prevY=e.clientY;});
const endDrag=e=>{if(e.pointerId===draggingPointer)draggingPointer=null;};
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
const stickEl=$('stick'),knob=$('knob');let stickPointer=null;
function moveStick(e){
 const rect=stickEl.getBoundingClientRect(),dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2),len=Math.hypot(dx,dy),ratio=Math.min(1,len/38);
 const x=len?dx/len*ratio:0,z=len?-dy/len*ratio:0;
 stick.set(z,0,x);knob.style.transform='translate('+x*38+'px,'+(-z)*38+'px)';
 if(ratio>.06)beginPlay();
}
stickEl.addEventListener('pointerdown',e=>{e.preventDefault();if(stickPointer!==null)return;stickPointer=e.pointerId;stickEl.setPointerCapture(e.pointerId);moveStick(e);});
stickEl.addEventListener('pointermove',e=>{if(stickPointer===e.pointerId){e.preventDefault();moveStick(e);}});
function stopStick(e){if(stickPointer!==e.pointerId)return;stickPointer=null;stick.set(0,0,0);knob.style.transform='translate(0,0)';}
stickEl.addEventListener('pointerup',stopStick);stickEl.addEventListener('pointercancel',stopStick);stickEl.addEventListener('lostpointercapture',stopStick);
document.addEventListener('selectstart',e=>e.preventDefault());
document.addEventListener('dragstart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
$('loading').classList.add('hidden');
requestAnimationFrame(frame);
