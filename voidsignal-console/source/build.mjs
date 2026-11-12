import {build} from 'esbuild';
await build({entryPoints:['frontend/main.tsx'],bundle:true,format:'esm',outdir:'public',entryNames:'app',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});

await build({entryPoints:['backend/worker.mjs'],bundle:true,format:'esm',platform:'browser',outfile:'backend-dist/worker.mjs',minify:true});
