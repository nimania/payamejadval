const assert=require('node:assert/strict');
const form=require('../clue-in-cell.js');
for(const variant of ['horizontal','vertical']){
 const {width,height}=form.sizes[variant];
 let item=form.blank(variant);
 item=form.addEntry(item,{id:'entry-1',clue:'ادامه یافتن',answer:'تداوم',
  clueCell:[0,5],direction:'across'});
 assert(form.inspect(item).valid,'valid unfinished editable '+variant+' draft');
 assert.equal(item.puzzle.grid.length,height);
 assert.equal(item.puzzle.grid[0].length,width);
 assert.equal(form.validate(item),false,'Incomplete draft must never be published');
 const bad=structuredClone(item);
 bad.puzzle.grid[0][2].answer='ب';
 assert.equal(form.inspect(bad).valid,false,'Stored answer changes must never pass');
 const extra=structuredClone(item);
 extra.puzzle.grid[3][3]={kind:'letter',answer:'ا'};
 assert.equal(form.inspect(extra).valid,false,'Uncovered letter cells are invalid');
}
console.log('Clue-in-cell 30x20 and 20x14 draft geometry, answer integrity and nonpublication checks passed.');
