'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),sudoku=require('../sudoku.js');
const source=process.argv[2]||'data/daily-games.json';
const data=JSON.parse(fs.readFileSync(source,'utf8'));
assert.equal(data.schema,1);
assert(Array.isArray(data.items));
const ids=new Set(),byDay=new Map();
for(const item of data.items){
 assert(!ids.has(item.id),'Unique public ID required');
 ids.add(item.id);
 assert(sudoku.validate(item),'Bad unique-solution puzzle: '+item.id);
 assert(item.id.startsWith('sudoku-'),'Daily auto-publication must never include unapproved word puzzles');
 const day=item.id.slice(7,17);
 assert(/^\d{4}-\d{2}-\d{2}$/.test(day));
 (byDay.get(day)||byDay.set(day,new Set()).get(day)).add(item.puzzle.difficulty);
}
for(const [date,levels] of byDay)
 assert.deepEqual([...levels].sort(),['easy','hard','medium'],'Each day publishes the three independently verified levels: '+date);
console.log('Verified public daily archive:',data.items.length,'games across',byDay.size,'day(s).');
