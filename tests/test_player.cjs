/* Pure public-player format regression, no private bank or network. */
const assert=require('node:assert/strict');
const {slotsFor,validateItem,groupedClues,cleanLetter}=require('../player.js');
const grid=Array.from({length:7},()=>Array(7).fill('ا'));
grid[0]=['ا','ب','','پ','ت','ث','ج'];
const slots=slotsFor(grid);
assert(slots);
const across=slots.filter(s=>s.dir==='horizontal'&&s.group===1);
assert.equal(across.length,2);
assert.equal(across[0].answer,'جثتپ','Across must read right to left');
assert.equal(across[1].answer,'با','Second across answer follows rightmost');
assert.equal(slots.some(s=>s.dir==='vertical'&&s.group===5&&s.cells[0][0]===1),true,
 'Down must start at uppermost white row');
const clues={horizontal:{},vertical:{}};
for(const s of slots)(clues[s.dir][String(s.group)]??=[]).push('سرنخ '+s.answer);
const item={id:'pub_test_1234567890',title:'جدول آزمون',puzzle:{version:3,grid,clues}};
assert(validateItem(item));
const first=groupedClues(item,'horizontal')[0];
assert.equal(first.number,1);
assert.equal(first.clues.length,2);
assert(first.text.indexOf('جثتپ')<first.text.indexOf('با'));
assert.equal(first.text.split(' - ').length,3,'One number and two hyphen-separated clues');
const bad=JSON.parse(JSON.stringify(item));
bad.puzzle.clues.horizontal['1'].pop();
assert(!validateItem(bad),'Missing clue must be rejected');
assert.equal(cleanLetter('ي'),'ی');
assert.equal(cleanLetter('ك'),'ک');
console.log('Public RTL player: shape, ordered multi-clues, Arabic-letter normalization passed.');
