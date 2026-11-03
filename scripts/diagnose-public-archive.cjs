/* Read-only public archive diagnostic. Never uses service credentials, private bank or writes. */
const project='jadval-studio',id='pub_d8ac3b41-8d6d-4ea2-8ce1-41547679812a';
const apiKey='AIzaSyD9-PPlqoSxfWNARZ-gLHqUaZTaG9D23B4'; // publicly exposed Firebase web API key
const player=require('../player.js'),quality=require('../quality-gate.js');
const base='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents/publishedPuzzles';
async function check(url){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(14000)}),data=await response.json().catch(()=>({}));
  return {code:response.status,data};
 }catch(e){return {code:0,error:e.message}};
}
(async()=>{
 const one=await check(base+'/'+id+'?key='+apiKey);
 console.log('known-document HTTP status:',one.code);
 if(one.code===200)console.log('public field types:',Object.fromEntries(Object.entries(one.data.fields||{}).map(([k,v])=>[k,Object.keys(v)[0]])));
 if(one.code===200){
  const f=one.data.fields||{},val=k=>f[k]?.stringValue||f[k]?.integerValue||null;
  const raw=val('puzzleJson');
  let audit='unparsed',meta='unknown',shape=false,errors=[];
  try{
   const puzzle=JSON.parse(raw||'null');
   shape=player.validateItem({id,title:val('title')||'نامشخص',puzzle});
   audit=quality.audit(puzzle);
   meta=JSON.stringify({status:puzzle?.meta?.status,method:puzzle?.meta?.method,profile:puzzle?.meta?.profile});
   errors=audit.errors.map(x=>x.code);
  }catch(e){audit=e.message}
  console.log(JSON.stringify({id,exists:true,title:val('title'),puzzleJsonLength:raw?.length,
    shapeValid:shape,meta,technicalPassed:audit?.technicalPassed,errors},null,2));
 }else console.log('known-document response:',one.data?.error?.message||one.error||'unknown');
 const many=await check(base+'?pageSize=100&key='+apiKey);
 console.log('collection listing HTTP status:',many.code);
 if(many.code===200)console.log('document count:',many.data.documents?.length||0,
  'public IDs:',(many.data.documents||[]).map(x=>x.name?.split('/').pop()));
 else console.log('collection listing error:',many.data?.error?.message||many.error||'unknown');
 const published=await check('https://nimania.github.io/payamejadval/data/published.json?recheck='+Date.now());
 console.log('GitHub Pages public snapshot HTTP status:',published.code);
 const expected=(published.data?.puzzles||[]).some(x=>x.id===id);
 console.log('Published puzzle found in live Pages JSON:',expected,
  'public count:',published.data?.puzzles?.length||0);
 if(!expected)process.exitCode=1;
 if(one.code!==200&&many.code!==200)process.exitCode=1;
})();
