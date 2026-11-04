'use strict';
// Public archive gate: unfinished drafts cannot be deployed.
const fs=require('node:fs'),assert=require('node:assert/strict');
const model=require('../clue-in-cell.js');
const source=process.argv[2]||'data/clue-in-cell-puzzles.json';
const data=JSON.parse(fs.readFileSync(source,'utf8'));
assert.equal(data.schema,1);
assert(Array.isArray(data.puzzles));
const ids=new Set();
for(const item of data.puzzles){
 assert(item?.type==='clue-in-cell'&&['horizontal','vertical'].includes(item.variant),'Unknown game kind');
 assert(typeof item.id==='string'&&!ids.has(item.id),'Every game needs a unique ID');
 ids.add(item.id);
 assert(model.validate(item),'Publication blocked: incomplete or unapproved clue-in-cell '+item.id);
 // Editorial quality for the first new-style 30x20 publication.
 if(item.id==='clue-horizontal-001'){
  const pairs=new Map();
  for(const entry of item.puzzle.entries){
   const key=entry.clueCell.join(',');
   pairs.set(key,(pairs.get(key)||0)+1);
   assert(entry.shortClue&&entry.shortClue.length<=17,
    'Short on-cell wording is mandatory for the first clue-in-cell edition');
  }
  const dual=[...pairs.values()].filter(v=>v===2).length;
  const capitals=item.puzzle.entries.filter(e=>e.clue.startsWith('پایتخت')).length;
  assert(dual>=30,'At least thirty two-direction clue cells required');
  assert(capitals/item.puzzle.entries.length<0.25,'Reduce repeated capital clues');
  assert(item.puzzle.meta?.revision==='2','Revisioned publication required');
  for(const entry of item.puzzle.entries){
   const [r,c]=entry.clueCell;
   assert(!(r===19&&entry.direction==='down'),'Bottom row cannot point down');
   assert(!(c===0&&entry.direction==='across'),'Leftmost array column cannot point left');
  }
 }

 assert(!Object.hasOwn(item,'bank')&&!Object.hasOwn(item,'entries'),'No private word bank in public archive');
}
console.log('Clue-in-cell public archive verified:',data.puzzles.length,'approved puzzle(s); all drafts excluded.');
