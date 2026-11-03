'use strict';
const assert=require('node:assert/strict');
const player=require('../player.js'),quality=require('../quality-gate.js');
const archive=require('../data/mini-puzzles.json');
assert.equal(archive.schema,1);
assert(archive.puzzles.length>0);
for(const item of archive.puzzles){
 assert.equal(item.type,'mini');
 assert.equal(item.puzzle.grid.length,5);
 assert(player.validateItem(item),'Mini playable: '+item.id);
 const audit=quality.audit(item.puzzle);
 assert(audit.technicalPassed,JSON.stringify(audit.errors));
 assert.equal(audit.errors.length,0,JSON.stringify(audit.errors));
 const slots=player.slotsFor(item.puzzle.grid);
 assert.equal(slots.length,10);
 assert.equal(new Set(slots.map(x=>x.answer)).size,10);
 assert(slots.every(x=>x.answer.length===5));
 for(const slot of slots){
  const clue=item.puzzle.clues[slot.dir][slot.group]?.[0];
  assert(typeof clue==='string'&&clue.length>=3);
 }
 console.log('Mini 5x5 verified:',item.id,slots.map(x=>x.answer).join('، '));
}
