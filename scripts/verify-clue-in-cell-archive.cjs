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
 assert(!Object.hasOwn(item,'bank')&&!Object.hasOwn(item,'entries'),'No private word bank in public archive');
}
console.log('Clue-in-cell public archive verified:',data.puzzles.length,'approved puzzle(s); all drafts excluded.');
