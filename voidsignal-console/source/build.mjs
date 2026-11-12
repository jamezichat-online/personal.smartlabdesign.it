import {build} from 'esbuild';
await build({entryPoints:['frontend/main.tsx'],bundle:true,format:'esm',outdir:'public',entryNames:'app',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
