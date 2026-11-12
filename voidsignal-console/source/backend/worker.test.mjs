import test from 'node:test';import assert from 'node:assert/strict';import worker,{equal,derive,validateRecord} from './worker.mjs';
test('secure comparisons and password derivation',async()=>{assert(await equal('a','a'));assert(!await equal('a','b'));const salt='a'.repeat(64);assert.equal(await derive('test password',salt),await derive('test password',salt));assert.notEqual(await derive('other password',salt),await derive('test password',salt));});
test('rejects invalid records and unsafe links',()=>{assert.throws(()=>validateRecord({kind:'bad',title:'x'}));assert.throws(()=>validateRecord({kind:'content',title:'x',url:'javascript:x'}));assert.equal(validateRecord({kind:'content',title:'x'}).title,'x');});
test('API rejects bad origins and anonymous clients',async()=>{const ctx={waitUntil(){}};let r=await worker.fetch(new Request('https://api.test/api/console',{headers:{Origin:'https://evil.test'}}),{},ctx);assert.equal(r.status,403);r=await worker.fetch(new Request('https://api.test/api/console',{headers:{Origin:'https://sites.smartlabdesign.it'}}),{},ctx);assert.equal(r.status,401);r=await worker.fetch(new Request('https://api.test/api/console',{method:'OPTIONS',headers:{Origin:'https://sites.smartlabdesign.it'}}),{},ctx);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://sites.smartlabdesign.it');});
test('experiments can be trashed and restored, other records cannot',async()=>{let row={kind:'experiment',body:JSON.stringify({id:'test-experiment',kind:'experiment',title:'My hypothesis'})};const env={DB:{prepare(sql){return{bind(...args){return{async first(){if(sql.startsWith('SELECT expires'))return{expires:Date.now()+3600000};if(sql.startsWith('SELECT kind,body'))return row;throw Error('Unexpected SQL')},async run(){if(sql.startsWith('UPDATE records')){row.body=args[0];return{success:true}}throw Error('Unexpected mutation')}}}}}}};const req=archived=>new Request('https://api.test/api/experiments/archive',{method:'POST',headers:{Origin:'https://sites.smartlabdesign.it','Content-Type':'application/json',Authorization:'Bearer '+'a'.repeat(64)},body:JSON.stringify({id:'test-experiment',archived})});let r=await worker.fetch(req(true),env,{});assert.equal(r.status,200);assert.equal(JSON.parse(row.body).archived,true);r=await worker.fetch(req(false),env,{});assert.equal(r.status,200);assert.equal(JSON.parse(row.body).archived,false);row.kind='content';r=await worker.fetch(req(true),env,{});assert.equal(r.status,404);assert.equal(JSON.parse(row.body).archived,false)});

// ---- Efficienza e resilienza -------------------------------------------------
import {catalogResponse,fingerprint,read} from './worker.mjs';
const ORIGIN='https://sites.smartlabdesign.it';
const BEARER='Bearer '+'a'.repeat(64);
function fakeDB({settings={},counts={c:2,m:'2026-11-12T10:00:00.000Z'},runs={c:1,m:'2026-11-12T09:00:00.000Z'}}={}){
  const log=[];
  const stmt=sql=>{
    const api=args=>({
      async first(){
        if(sql.startsWith('SELECT expires'))return{expires:Date.now()+3600000};
        if(sql.includes("id='catalog-cache'"))return settings['catalog-cache']?{value:settings['catalog-cache']}:null;
        if(sql.includes('FROM records')&&sql.includes('COUNT'))return counts;
        if(sql.includes('FROM sync_runs')&&sql.includes('COUNT'))return runs;
        throw Error('Unexpected first: '+sql);
      },
      async all(){log.push(sql);return{results:[]}},
      async run(){if(sql.startsWith('INSERT INTO settings')){settings['catalog-cache']=args[0];return{meta:{changes:1}}}throw Error('Unexpected run: '+sql)},
    });
    return{...api([]),bind:(...args)=>api(args)};
  };
  return{prepare:stmt,log,settings};
}
const get=(path,db,headers={})=>worker.fetch(new Request('https://api.test'+path,{headers:{Origin:ORIGIN,Authorization:BEARER,...headers}}),{DB:db},{waitUntil(){}});
const realFetch=globalThis.fetch;

test('validation errors expose a safe message with status 400',async()=>{
  const r=await worker.fetch(new Request('https://api.test/api/console',{method:'POST',headers:{Origin:ORIGIN,Authorization:BEARER,'Content-Type':'application/json'},body:JSON.stringify({kind:'content',title:'x',url:'http://insecure'})}),{DB:fakeDB()},{waitUntil(){}});
  assert.equal(r.status,400);assert.equal((await r.json()).error,'Usa collegamenti HTTPS');
});

test('catalog: upstream failure is a 502, never a generic 400',async()=>{
  globalThis.fetch=async()=>new Response('nope',{status:503});
  try{const r=await get('/api/catalog',fakeDB());assert.equal(r.status,502);assert.equal((await r.json()).code,'upstream_unavailable');}finally{globalThis.fetch=realFetch}
});

test('catalog: off-origin redirects are refused (no SSRF via redirect)',async()=>{
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://evil.test/x'}});
  try{const r=await get('/api/catalog',fakeDB());assert.equal(r.status,502)}finally{globalThis.fetch=realFetch}
});

test('catalog: fresh cache is served without touching the site',async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not be called')};
  const now=Date.now();const db=fakeDB({settings:{'catalog-cache':JSON.stringify({at:now-60000,data:{products:[1],assets:[]}})}});
  try{const out=await catalogResponse(db,false,now);assert.equal(out.cache,'hit');assert.equal(calls,0)}finally{globalThis.fetch=realFetch}
});

test('catalog: stale cache is served when the refresh fails',async()=>{
  globalThis.fetch=async()=>new Response('down',{status:500});
  const now=Date.now();const db=fakeDB({settings:{'catalog-cache':JSON.stringify({at:now-7*3600000,data:{products:[1],assets:[]}})}});
  try{const out=await catalogResponse(db,true,now);assert.equal(out.cache,'stale');assert.equal(out.refreshError,'status');assert.deepEqual(out.products,[1])}finally{globalThis.fetch=realFetch}
});

test('console: ETag allows a cheap 304 and the capped query is used',async()=>{
  const db=fakeDB();
  const first=await get('/api/console',db);assert.equal(first.status,200);const tag=first.headers.get('ETag');assert.match(tag,/^W\/"/);
  assert.ok(db.log.some(q=>q.includes('ROW_NUMBER')),'usa la query con tetti per tipo');
  const second=await get('/api/console',db,{'If-None-Match':tag});assert.equal(second.status,304);
  const full=await get('/api/console?all=1',db);assert.equal(full.status,200);assert.ok(db.log.some(q=>q==='SELECT * FROM records ORDER BY updated DESC'),'export completo senza tetti');
  assert.equal(await fingerprint(db),tag);
});

test('CORS lets the console send If-None-Match and read ETag',async()=>{
  const r=await worker.fetch(new Request('https://api.test/api/console',{method:'OPTIONS',headers:{Origin:ORIGIN}}),{},{waitUntil(){}});
  assert.match(r.headers.get('Access-Control-Allow-Headers'),/If-None-Match/);assert.equal(r.headers.get('Access-Control-Expose-Headers'),'ETag');
});
