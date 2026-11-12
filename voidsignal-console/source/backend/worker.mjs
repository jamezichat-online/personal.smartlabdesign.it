const ORIGIN='https://sites.smartlabdesign.it';
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b)).map(n=>n.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from(s.match(/../g)||[],x=>parseInt(x,16));
export const hash=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
export async function equal(a,b){const k=await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},false,['sign','verify']);return crypto.subtle.verify('HMAC',k,await crypto.subtle.sign('HMAC',k,enc.encode(a)),enc.encode(b));}
export async function derive(p,s){const k=await crypto.subtle.importKey('raw',enc.encode(p),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(s),iterations:100000,hash:'SHA-256'},k,256));}
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
async function session(db){const t=token();await db.prepare('INSERT INTO sessions (hash,expires) VALUES (?,?)').bind(await hash(t),Date.now()+8*3600000).run();return t;}
export async function read(db){const [r,s]=await Promise.all([db.prepare('SELECT * FROM records ORDER BY updated DESC').all(),db.prepare('SELECT * FROM sync_runs ORDER BY captured DESC LIMIT 30').all()]);return{records:r.results.map(v=>({...JSON.parse(v.body),id:v.id,kind:v.kind,updated:v.updated})),runs:s.results.map(v=>({...JSON.parse(v.body),id:v.id,capturedAt:v.captured}))};}
export function validateRecord(v){if(!v||!['content','asset','experiment'].includes(v.kind)||typeof v.title!=='string'||!v.title.trim()||v.title.length>300)throw Error('Scheda non valida');if(v.id!=null&&(typeof v.id!=='string'||v.id.length>100))throw Error('ID non valido');for(const k of ['url','asset'])if(v[k]&&!/^https:\/\//.test(v[k]))throw Error('Usa collegamenti HTTPS');if(v.scenes&&(!Array.isArray(v.scenes)||v.scenes.length>100))throw Error('Scene non valide');return v;}
export default{async fetch(request,env,ctx){const u=new URL(request.url);const origin=request.headers.get('Origin');const allowed=origin===ORIGIN||(env.LOCAL_DEV==='true'&&origin==='http://127.0.0.1:5180');const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...(allowed?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}:{})};const json=(v,status=200)=>Response.json(v,{status,headers});try{
if(request.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers});
if(u.pathname==='/health')return json({ok:true,service:'voidsignal-editorial-api'});
if(!allowed)return json({error:'Origine non autorizzata'},403);
if(!['GET','POST'].includes(request.method))return json({error:'Metodo non consentito'},405);
let v;if(request.method==='POST'){if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Formato non valido'},415);const reader=request.body?.getReader();let bytes=0,chunks=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1_000_000){await reader.cancel();return json({error:'Dati troppo grandi'},413);}chunks.push(value);}}const all=new Uint8Array(bytes);let i=0;for(const c of chunks){all.set(c,i);i+=c.length;}v=JSON.parse(new TextDecoder().decode(all));}
if(['/auth/setup','/auth/login'].includes(u.pathname)&&request.method==='POST'){
const ip=await hash(request.headers.get('CF-Connecting-IP')||'unknown');const bucket=ip+':'+Math.floor(Date.now()/900000);const limit=await env.DB.prepare('INSERT INTO login_limits (id,count,until) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,Date.now()+900000).first();if(limit.count>10)return json({error:'Troppi tentativi. Riprova tra 15 minuti.'},429);
if(typeof v?.password!=='string'||v.password.length>256)return json({error:'Password non valida'},400);
let stored=await env.DB.prepare("SELECT value FROM settings WHERE id='owner'").first();
if(u.pathname==='/auth/setup'){
if(stored)return json({error:'Console già attivata. Usa Accedi.'},409);
if(v.password.length<14)return json({error:'Usa almeno 14 caratteri.'},400);
if(!env.BOOTSTRAP_HASH||typeof v.setupToken!=='string'||v.setupToken.length>100||!await equal(await hash(v.setupToken),env.BOOTSTRAP_HASH))return json({error:'Link di attivazione non valido'},403);
const salt=token();const passwordHash=await derive(v.password,salt);const res=await env.DB.prepare("INSERT OR IGNORE INTO settings (id,value) VALUES ('owner',?)").bind(JSON.stringify({salt,passwordHash})).run();if(!res.meta.changes)return json({error:'Console già attivata'},409);
}else{if(!stored)return json({error:'Console in attesa di attivazione del proprietario'},403);const p=JSON.parse(stored.value);if(!await equal(await derive(v.password,p.salt),p.passwordHash))return json({error:'Credenziali non valide'},401);}
ctx.waitUntil(env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(Date.now()),env.DB.prepare('DELETE FROM login_limits WHERE until < ?').bind(Date.now())]));return json({token:await session(env.DB),expiresIn:28800});}
const bearer=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!bearer)return json({error:'Accesso richiesto'},401);const tokenHash=await hash(bearer);const valid=await env.DB.prepare('SELECT expires FROM sessions WHERE hash=? AND expires>?').bind(tokenHash,Date.now()).first();if(!valid)return json({error:'Sessione scaduta. Accedi di nuovo.'},401);
if(u.pathname==='/auth/logout'&&request.method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(tokenHash).run();return json({ok:true});}
if(u.pathname==='/api/console'&&request.method==='GET')return json(await read(env.DB));
if(u.pathname==='/api/console'&&request.method==='POST'){validateRecord(v);const id=v.id||crypto.randomUUID(),updated=new Date().toISOString();await env.DB.prepare('INSERT INTO records (id,kind,body,updated) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,updated=excluded.updated').bind(id,v.kind,JSON.stringify({...v,id}),updated).run();return json({id,updated});}
return json({error:'Non trovato'},404);
}catch(e){console.error(JSON.stringify({event:'request_failed',path:u.pathname,errorType:e?.name||'Error'}));return json({error:e instanceof SyntaxError?'Dati non validi':'Operazione non riuscita. Riprova.'},400);}}};
