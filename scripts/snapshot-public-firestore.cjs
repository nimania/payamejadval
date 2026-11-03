/* Rebuild the public-only crosswords snapshot at deploy time.
   Reads *public* publishedPuzzles via anonymous Firestore REST.
   Never reads private bank, credentials or drafts.
   Deployment aborts rather than silently publishing an empty archive. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const player=require('../player.js');
const quality=require('../quality-gate.js');
const project='jadval-studio';
const config=fs.readFileSync(path.join(__dirname,'../firebase-config.js'),'utf8');
const match=config.match(/apiKey:\s*["']([^"']+)["']/);
if(!match)throw Error('Public Firebase configuration has no API key');
const key=match[1];
const base='https://firestore.googleapis.com/v1/projects/'+project+
 '/databases/(default)/documents/publishedPuzzles';
const output=process.argv[2]||'public/data/published.json';
function value(field){
 if(!field||typeof field!=='object')return undefined;
 if('stringValue'in field)return field.stringValue;
 if('timestampValue'in field)return field.timestampValue;
 if('integerValue'in field)return Number(field.integerValue);
 return undefined;
}
function fromDoc(doc){
 const data=doc.fields||{};
 const id=value(data.id)||String(doc.name||'').split('/').pop();
 const title=value(data.title);
 const serialized=value(data.puzzleJson);
 if(typeof serialized!=='string')return {id,reason:'missing-puzzle-json'};
 let puzzle;
 try{puzzle=JSON.parse(serialized)}catch(_){return {id,reason:'invalid-json'}};
 const item={id,title,type:'crossword',publishedAt:value(data.publishedAt)||null,puzzle};
 if(!player.validateItem(item))return {id,reason:'invalid-grid-or-clues'};
 if(puzzle.meta?.status!=='published'||puzzle.meta?.method!=='editor-approved')
  return {id,reason:'not-editor-approved'};
 const audit=quality.audit(puzzle);
 if(!audit.technicalPassed||audit.errors.length)
  return {id,reason:'quality-gate:'+audit.errors.map(e=>e.code).join(',')};
 return {item};
}
async function retrieve(){
 let pageToken='',count=0,pages=0,items=new Map();
 do{
  const url=new URL(base);
  url.searchParams.set('pageSize','100');
  url.searchParams.set('key',key);
  if(pageToken)url.searchParams.set('pageToken',pageToken);
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Firestore list failed: HTTP '+response.status);
  const parsed=await response.json();pages++;
  if(pages>1000)throw Error('Unexpectedly large Firestore archive');
  for(const doc of parsed.documents||[]){
   count++;
   const entry=fromDoc(doc);
   if(!entry.item){
    console.log('Excluded unpublished or invalid public record:',entry.id,entry.reason);
    continue;
   }
   if(items.has(entry.item.id))throw Error('Duplicate public document id');
   items.set(entry.item.id,entry.item);
  }
  pageToken=parsed.nextPageToken||'';
 }while(pageToken);
 if(!items.size)throw Error('No approved public puzzles: refusing empty archive deployment. Indexed '+count+' documents.');
 const sorted=[...items.values()].sort((a,b)=>Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0));
 const result={schema:1,updatedAt:new Date().toISOString(),source:'public-firestore-verified-deploy-snapshot',puzzles:sorted};
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n','utf8');
 console.log('Built verified public snapshot:',sorted.length,'approved crossword(s) from',count,
  'public Firestore document(s):',sorted.map(x=>x.id).join(', '));
}
if(require.main===module)retrieve().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={fromDoc,value};
