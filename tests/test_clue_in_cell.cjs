const assert=require('node:assert/strict');
const form=require('../clue-in-cell.js');
function sample(variant){
 const {width,height}=form.sizes[variant];
 const grid=Array.from({length:height},()=>Array.from({length:width},()=>({kind:'block'})));
 grid[0][5]={kind:'clue'};
 const word='تداوم';
 for(let i=0;i<5;i++)grid[0][4-i]={kind:'letter',answer:word[i]};
 return {id:'test-'+variant,type:'clue-in-cell',variant,
  puzzle:{version:1,grid,entries:[{
   id:'entry-1',clue:'ادامه یافتن',answer:word,clueCell:[0,5],
   start:[0,4],direction:'across'}]}};
}
for(const variant of ['horizontal','vertical']){
 const item=sample(variant);
 assert(form.validate(item),'valid editable '+variant+' format');
 assert.equal(item.puzzle.grid.length,form.sizes[variant].height);
 assert.equal(item.puzzle.grid[0].length,form.sizes[variant].width);
 const bad=structuredClone(item);
 bad.puzzle.grid[0][2].answer='ب';
 assert.equal(form.validate(bad),false,'crossings must never disagree');
 const unmatched=structuredClone(item);unmatched.puzzle.grid[3][3]={kind:'letter',answer:'ا'};
 assert.equal(form.validate(unmatched),false,'unfilled letter cells are invalid');
}
console.log('Clue-in-cell 30x20 and 20x14 geometry and word integrity checks passed.');
