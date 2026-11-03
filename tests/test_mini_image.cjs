/* Instagram image regression: never omit a clue or show answers on blank sheet. */
'use strict';
const assert=require('node:assert/strict');
const renderer=require('../mini-image.js');
const player=require('../player.js');
const archive=require('../data/mini-puzzles.json');
function createContext(){
 const calls={text:[],rects:[],images:0};
 const context={
  font:'400 24px Tahoma',fillStyle:'#fff',strokeStyle:'#111',lineWidth:1,
  direction:'rtl',textAlign:'right',textBaseline:'middle',
  fillRect(...args){calls.rects.push(args);},
  strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
  drawImage(){calls.images++;},
  fillText(value,x,y){
   assert(Number.isFinite(x)&&Number.isFinite(y),'Canvas coordinates must be finite');
   calls.text.push({text:String(value),x,y});
  },
  measureText(value){
   const fontSize=Number(this.font.match(/(\d+)px/)?.[1]||24);
   const weight=[...String(value)].reduce((v,ch)=>v+
    (ch===' '?0.30:/[۰-۹٠-٩0-9]/.test(ch)?0.45:0.66),0);
   return {width:weight*fontSize};
  }
 };
 return {context,calls};
}
assert.equal(renderer.width,1080);
assert.equal(renderer.height,1350);
for(const item of archive.puzzles){
 assert(player.validateItem(item),'Only valid published 5x5 grids can be exported');
 const allClues=[...Object.values(item.puzzle.clues.horizontal).flat(),
  ...Object.values(item.puzzle.clues.vertical).flat()];
 for(const mode of ['blank','answers']){
  const {context,calls}=createContext();
  const painted=renderer.renderCanvas(context,item,mode,{width:300,height:100},player);
  assert.equal(painted.width,1080);assert.equal(painted.height,1350);
  assert.equal(painted.clues,10,'Each mini puzzle has five across and five down clues');
  assert.equal(calls.images,1,'Real site logo must be drawn');
  assert(painted.layout.columns.every(col=>
   painted.layout.bodyTop+col.height<=1214),'No wrapped clue may be clipped by footer');
  assert(allClues.every(clue=>calls.text.some(v=>v.text===clue||v.text.includes(clue)||
   clue.split(/\s+/).every(word=>calls.text.some(v=>v.text.includes(word))))),
   'Every complete clue must appear in image');
  const chars=calls.text.filter(entry=>/^[آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیؤئء]$/.test(entry.text));
  if(mode==='blank')assert.equal(chars.length,0,'Blank image must not reveal letter answers');
  else assert.equal(chars.length,25,'Solved image must fill exactly 25 white 5x5 cells');
  assert(renderer.filename(item,mode).endsWith('-instagram-1080x1350.png'));
 }
}
const {context}=createContext();
assert.throws(()=>renderer.renderCanvas(context,{...archive.puzzles[0],type:'sudoku'},'blank',null,player),/۵×۵/);
assert.throws(()=>renderer.renderCanvas(context,archive.puzzles[0],'unknown',null,player),/ناشناخته/);
console.log('Instagram PNG layout: 1080x1350, logo, 10 RTL clues, full 5x5 and spoiler-free blank + filled solution; all published minis pass.');
