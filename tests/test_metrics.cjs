const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../metrics.js'),P=require('../player.js');
assert.equal(M.normalize(' كِتاب  '),'کتاب');
assert.equal(M.normalize('ياد\u200cداشت'),'یادداشت');
const entries=[
 {answer:'کتاب',clue:'چیز خواندنی'},
 {answer:' كتاب ',clue:'چیز خواندنی'},
 {answer:'کتاب',clue:'جلد کاغذی نوشته'},
 {answer:'کتاب',clue:'چیز خواندنی '}
];
const summary=M.summarize(entries);
assert.equal(summary.totalEntries,4);
assert.equal(summary.uniquePairs,2,'same clue+answer removed');
assert.equal(summary.duplicateEntries,2);
assert.equal(summary.uniqueAnswers,1,'different clue may share answer');
assert.equal(summary.uniqueClues,2);
const grid=Array.from({length:7},()=>Array(7).fill('ا'));
const slots=P.slotsFor(grid);
function make(id,mode){
 const clues={horizontal:{},vertical:{}};
 for(let i=0;i<slots.length;i++){
  const s=slots[i];
  (clues[s.dir][String(s.group)]??=[]).push(mode==='original'?'مشترک '+i:
   mode==='newclues'?'تازه '+i:'مخلوط '+i);
 }
 return {id,title:id,puzzle:{version:3,grid,clues}};
}
const a=make('A','original'),b=make('B','original'),c=make('C','newclues');
assert(P.validateItem(a)&&P.validateItem(b)&&P.validateItem(c));
let w=M.overlap(a,[b],10,P);
assert.equal(w.actual,1);assert.equal(w.exactPct,100);assert.equal(w.answerPct,100);
w=M.overlap(c,[b],30,P);
assert.equal(w.exactPct,0,'New questions make different pair even if answer repeats');
assert.equal(w.answerPct,100);
assert.equal(w.requested,30);assert.equal(w.actual,1);assert.equal(w.enoughHistory,false);
const list=[c,b,a];const found=M.windows(c,list,P);
assert.deepEqual(found.map(x=>x.requested),[10,30,100]);
assert(found.every(x=>x.actual===2));
const stats=JSON.parse(fs.readFileSync('data/bank-stats.json','utf8'));
assert.equal(stats.totalEntries,19387);
assert.equal(stats.uniquePairs,19387);
assert.equal(stats.uniqueAnswers,11425);
assert.equal(stats.uniqueClues,17370);
assert.equal(stats.lengths.reduce((a,b)=>a+b.entries,0),stats.totalEntries);
const payload=JSON.stringify(stats);
assert(!payload.includes('entries":['),'Public stats may contain only numbers, not private pairs');
console.log('Pair-based dedup, answer-only novelty, history window counts and sanitized public aggregate are valid.');
