const assert=require('node:assert/strict');
const sudoku=require('../sudoku.js');
const dates=['2026-11-03','2026-11-04'];
for(const date of dates){
 const outputs=[];
 for(const difficulty of ['easy','medium','hard']){
  const item=sudoku.create(date,difficulty);
  assert(sudoku.validate(item),JSON.stringify({date,difficulty,quality:item.puzzle.quality}));
  assert.equal(sudoku.countSolutions(item.puzzle.givens,2),1);
  assert.equal(sudoku.create(date,difficulty).puzzle.givens,item.puzzle.givens,'Daily puzzles are deterministic');
  outputs.push(item.puzzle.givens);
  console.log(date,difficulty,JSON.stringify(item.puzzle.quality));
 }
 assert.equal(new Set(outputs).size,3);
}
const item=sudoku.create('2026-11-05','easy');
const bad=JSON.parse(JSON.stringify(item));
bad.puzzle.solution='1'.repeat(81);
assert.equal(sudoku.validate(bad),false);
const broken=JSON.parse(JSON.stringify(item));
broken.puzzle.givens='0'.repeat(81);
assert.equal(sudoku.validate(broken),false,'Nonunique empty grid must not pass');
console.log('Sudoku one-solution QA passed for all daily difficulty variants.');
