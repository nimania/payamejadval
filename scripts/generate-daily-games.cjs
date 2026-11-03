/* Idempotent daily release; safe on multiple retries.
   The only automatically published game type is unique-solution 9x9 Sudoku.
   Crossword and clue-in-cell puzzles still require an approved source/solver. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const sdk=require('../sudoku.js');
const out=path.join(__dirname,'../data/daily-games.json');
const date=process.argv[2]||new Intl.DateTimeFormat('en-CA',{
 timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'
}).format(new Date());
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Date must use YYYY-MM-DD');
const old=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):{schema:1,items:[]};
if(old.schema!==1||!Array.isArray(old.items))throw Error('Daily archive schema is invalid');
const games=new Map();
for(const item of old.items){
 if(!sdk.validate(item))throw Error('Invalid previously published game: '+item?.id);
 if(games.has(item.id))throw Error('Duplicate game ID '+item.id);
 games.set(item.id,item);
}
let appended=0;
for(const diff of ['easy','medium','hard']){
 const item=sdk.create(date,diff);
 if(!sdk.validate(item))throw Error('Failed quality gate for '+diff);
 if(games.has(item.id)){
  const oldItem=games.get(item.id);
  if(JSON.stringify(oldItem.puzzle)!==JSON.stringify(item.puzzle))
   throw Error('Existing daily puzzle is immutable: '+item.id);
  continue;
 }
 games.set(item.id,item);appended++;
}
const items=[...games.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id));
fs.mkdirSync(path.dirname(out),{recursive:true});
const result={schema:1,updatedAt:new Date().toISOString().slice(0,10),items};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log('Daily published Sudoku:',date,'new',appended,'total',items.length);
