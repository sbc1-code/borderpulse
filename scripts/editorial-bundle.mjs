#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { checkBundle, verifyBundle, renderEditorial, validateEditorialPosts } from './lib/editorial-bundle.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function prepareEditorial(root, input, {now=Date.now(),fetcher,write=false}={}) {
  validateEditorialPosts(root);
  const posts=fs.readdirSync(path.join(root,'src/content/blog')).filter(f=>f.endsWith('.mdx'))
    .map(f=>matter(fs.readFileSync(path.join(root,'src/content/blog',f),'utf8')).data).filter(p=>!p.draft);
  const date=new Date(now).toISOString().slice(0,10);
  if(posts.some(p=>['daily-pilot','ai-editorial'].includes(p.source)&&p.date===date))return {status:'skip',reason:'automated-report-already-published-today'};
  const current=JSON.parse(fs.readFileSync(path.join(root,'public/data/crossings.json'),'utf8'));
  const receipt=await verifyBundle(input,{now,fetcher,existing:posts,portIds:new Set(current.crossings.map(c=>c.port_number))});
  const id=receipt.bundle.id;
  const files=[{path:`public/data/editorial-evidence/${id}.json`,content:JSON.stringify(receipt,null,2)+'\n'},
    ...['en','es'].map(lang=>({path:`src/content/blog/${id}${lang==='es'?'-es':''}.mdx`,content:renderEditorial(receipt,lang)}))];
  if(files.some(f=>fs.existsSync(path.join(root,f.path))))throw new Error('Editorial destination exists; refusing overwrite');
  if(write){for(const f of files){fs.mkdirSync(path.dirname(path.join(root,f.path)),{recursive:true});fs.writeFileSync(path.join(root,f.path),f.content,{flag:'wx'});}validateEditorialPosts(root);}
  return {status:'eligible',files,receipt};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [command,bundlePath,...args]=process.argv.slice(2);
    if(command==='check-published'){console.log(JSON.stringify({reports:validateEditorialPosts(root)}));}
    else{
      if(!['validate','verify','plan'].includes(command)||!bundlePath)throw new Error('Usage: editorial-bundle.mjs validate|verify|plan bundle.json [--out plan.json], or check-published');
      const input=JSON.parse(fs.readFileSync(path.resolve(bundlePath),'utf8'));
      if(command==='validate')console.log(JSON.stringify({status:'structurally-valid',fingerprint:checkBundle(input).fingerprint,semanticVerification:'requires recorded AI evidence review and source re-fetch; schema alone is not proof'}));
      else if(command==='verify'){
        const receipt=await verifyBundle(input);const out=args[0]==='--out'?args[1]:null;
        if(out)fs.writeFileSync(path.resolve(out),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
        console.log(JSON.stringify({status:'source-spans-verified',sources:receipt.confirmations.length,receipt:out,semanticVerification:'AI-review attestation; not proven by substring checks'}));
      }else{
        const result=await prepareEditorial(root,input);const out=args[0]==='--out'?args[1]:null;
        if(!out)throw new Error('plan requires --out: the output contains full prepared content');
        fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
        console.log(JSON.stringify({status:result.status,reason:result.reason,out,writtenToContent:false}));
      }
    }
  }catch(error){console.error('[editorial] held: '+error.message);process.exitCode=1;}
}
