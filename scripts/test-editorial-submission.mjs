import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolveEditorialSubmission} from './resolve-editorial-submission.mjs';
const first='drafts/editorial/inbox/2026-10-29-california-road-information-tools.json';
const second='drafts/editorial/inbox/2026-10-29-other-notice.json';
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'editorial-input-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const git=args=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 git(['init','--initial-branch=main']);git(['config','user.name','fixture']);git(['config','user.email','fixture@example.test']);
 const put=(file,content)=>{fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),content);};
 const commit=()=>{git(['add','.']);git(['commit','-m','fixture']);return git(['rev-parse','HEAD']).trim();};
 put('README.md','local fixture only');const before=commit();
 put(first,'{"createdAt":"2026-10-29T23:00:00.000Z"}');const after=commit();
 return{git,put,commit,before,after,event:{ref:'refs/heads/main',before,after,commits:[{id:after}]}};
}
test('real commit trees resolve a connector push with no changed-file attributes',t=>{
 const f=fixture(t);const r=resolveEditorialSubmission({eventName:'push',event:f.event,git:f.git});
 assert.equal(r.path,first);assert.equal(r.blobSha,f.git(['rev-parse',`${f.after}:${first}`]).trim());
});
test('a multi-commit push that edits the same input remains one submission',t=>{
 const f=fixture(t);f.put(first,'{"revision":2}');f.commit();f.put('README.md','unrelated data context');const after=f.commit();
 const r=resolveEditorialSubmission({eventName:'push',event:{...f.event,after,commits:[]},git:f.git});assert.equal(r.path,first);
});
test('two distinct inbox files still hold rather than selecting an arbitrary article',t=>{
 const f=fixture(t);f.put(second,'{}');const after=f.commit();
 assert.throws(()=>resolveEditorialSubmission({eventName:'push',event:{...f.event,after},git:f.git}),/exactly one/);
});
test('current-main data changes preserve the input identity, while a newer input does not',t=>{
 const f=fixture(t);f.put('public/data/fixture.json','{}');f.commit();
 assert.equal(resolveEditorialSubmission({eventName:'push',event:f.event,git:f.git}).path,first);
 f.put(first,'{"revision":3}');f.commit();
 assert.throws(()=>resolveEditorialSubmission({eventName:'push',event:f.event,git:f.git}),/changed after/);
});
test('manual dry runs accept the original creation-date filename without rewriting dates',t=>{
 const f=fixture(t);const r=resolveEditorialSubmission({eventName:'workflow_dispatch',event:{},inputPath:first,git:f.git});
 assert.equal(r.path,first);assert.throws(()=>resolveEditorialSubmission({eventName:'workflow_dispatch',event:{},inputPath:'docs/README.md',git:f.git}),/exactly one/);
});
test('shallow runners fetch only missing exact event commits',()=>{
 const before='a'.repeat(40),after='b'.repeat(40),blob='c'.repeat(40),calls=[];let fetched=false;
 const git=args=>{calls.push(args);if(args[0]==='cat-file'&&args[2]===`${before}^{commit}`&&!fetched)throw new Error('missing');
 if(args[0]==='fetch'){fetched=true;return'';}if(args[0]==='diff')return first+'\0';if(args[0]==='rev-parse'||args[0]==='hash-object')return blob+'\n';return'';};
 assert.equal(resolveEditorialSubmission({eventName:'push',event:{ref:'refs/heads/main',before,after},git}).path,first);
 assert.deepEqual(calls.filter(x=>x[0]==='fetch'),[['fetch','--no-tags','--depth=1','origin',before]]);
});
