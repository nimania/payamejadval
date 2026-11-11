"use strict";
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"kalamechin.html"),"utf8");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const catalog=fs.readFileSync(path.join(root,"public-app.js"),"utf8");
assert.ok(index.includes('href="./kalamechin.html"'),"Main navigation must link game");
assert.ok(catalog.includes("play.href='./kalamechin.html'"),"Homepage card must link game");
assert.ok(!html.includes("آبادیس"),"Only independently branded content");
const block=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(block,"Game script must exist");
new vm.Script(block[1],{filename:"kalamechin.html"});
const match=block[1].match(/const LEVELS=(\[[^\n]+\]);/);
assert.ok(match,"Curated levels must be included");
const levels=JSON.parse(match[1]);
assert.equal(levels.length,50,"Game MVP must contain 50 complete stages");
let answerCount=0;
for(const [i,level] of levels.entries()){
 assert.equal(level.id,i+1,"Stage IDs must remain sequential");
 assert.ok(level.words.length>=2,"Each stage needs at least two solutions");
 assert.equal(new Set(level.words).size,level.words.length,"No duplicate solutions in a stage");
 assert.ok(level.words.includes(level.letters),"Wheel seed should be a solution");
 assert.ok(level.letters.length>=3&&level.letters.length<=8,"Wheel must fit layout");
 for(const word of level.words){
  assert.match(word,/^[آ-ی]+$/u,"Words must be Persian characters");
  const pool=[...level.letters];
  for(const ch of word){
   const pos=pool.indexOf(ch);
   assert.ok(pos>=0,"Impossible solution in stage "+level.id+": "+word);
   pool.splice(pos,1);
  }
  answerCount++;
 }
}
for(const id of ["stageLabel","coins","targets","wordInput","letterBank","submit","hint","win","continue"]){
 assert.ok(html.includes('id="'+id+'"'),"Missing UI element "+id);
}

const proHtml=fs.readFileSync(path.join(root,"kalamechin-pro.html"),"utf8");
const proData=JSON.parse(fs.readFileSync(path.join(root,"data/kalamechin-pro.json"),"utf8"));
assert.equal(proData.schema,1);
assert.ok(proData.levels.length>=20,"Advanced mode needs at least 20 published stages");
assert.ok(index.includes('href="./kalamechin-pro.html"'),"Professional mode must appear in nav");
assert.ok(html.includes('id="wordInput"')&&!html.includes('id="wheel"'),"Classic uses the native phone keyboard");
assert.ok(proHtml.includes('id="wordInput"')&&!proHtml.includes('id="wheel"'),"Advanced uses the native phone keyboard");
assert.ok(proHtml.includes('direction:rtl'),"Advanced board must declare RTL layout");
assert.ok(proHtml.includes('for(let c=p.cols-1;c>=0;c--)'),"RTL DOM must start at rightmost logical column");
assert.ok(proHtml.includes("c=place.c-(place.d==='h'?i:0)"),"Horizontal words advance toward left of first letter");
assert.ok(proHtml.includes("className='number horizontal'"),"Horizontal start numbers must render at right");
assert.ok(proHtml.includes("right:2px"),"Horizontal numbers must be right-aligned");
assert.ok(proHtml.includes("tg.requestFullscreen?.()"),"Mini App should request fullscreen on supported Telegram clients");
assert.ok(proHtml.includes('visualViewport'),"Grid must adapt to mobile native keyboard height");
for(const id of ["questionTopRef","questionTopText","questionBottomRef","questionBottomText"]){
 assert.ok(proHtml.includes('id="'+id+'"'),"Advanced clue banner missing: "+id);
}
assert.ok(proHtml.includes("questionBottomText').textContent=clue"),"Active clue must synchronize above and below");


assert.ok(html.includes('href="./kalamechin-pro.html"'),"Classic mode must link advanced mode");
assert.ok(proHtml.includes('href="./kalamechin.html"'),"Advanced mode must link classic mode");
assert.ok(proHtml.includes('data/kalamechin-pro.json'),"Client must load the professional level data");
const proScript=proHtml.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(proScript,"Professional game script missing");
new vm.Script(proScript[1],{filename:"kalamechin-pro.html"});
let proWords=0;
for(const [ix,stage] of proData.levels.entries()){
 assert.equal(stage.id,ix+1,"Pro stage IDs are sequential");
 assert.ok(stage.words.length>=4,"Each pro stage must have 4+ solutions");
 assert.equal(stage.words.length,stage.placements.length,"Every solution must have a placement");
 assert.ok(stage.clues&&typeof stage.clues==="object","Advanced stage must have authored clues");
 for(const answer of stage.words){
  assert.ok(typeof stage.clues[answer]==="string"&&stage.clues[answer].trim().length>=8,"Missing or vague question for "+answer);
 }

 assert.ok(stage.rows>=2&&stage.cols>=2&&stage.rows<=16&&stage.cols<=16,"Board must fit a phone");
 assert.ok(new Set(stage.words).size===stage.words.length,"Duplicate pro solutions");
 assert.ok(stage.words.includes(stage.letters),"Each stage seed word must be a solution");
 const grid=Array.from({length:stage.rows},()=>Array(stage.cols).fill(null));
 const directions=Array.from({length:stage.rows},()=>Array.from({length:stage.cols},()=>new Set()));
 for(const place of stage.placements){
  assert.ok(stage.words.includes(place.w),"Unexpected placed word");
  assert.ok(["h","v"].includes(place.d),"Invalid word axis");
  assert.ok(/^[آ-ی]+$/u.test(place.w),"Non-Persian solution");
  const remaining=[...stage.letters];
  for(const ch of place.w){
   const n=remaining.indexOf(ch);assert.ok(n>=0,"Word cannot be made from wheel: "+place.w);
   remaining.splice(n,1);
  }
  [...place.w].forEach((ch,i)=>{
   const r=place.r+(place.d==="v"?i:0),c=place.c-(place.d==="h"?i:0);
   assert.ok(r>=0&&c>=0&&r<stage.rows&&c<stage.cols,"Out-of-bounds crossword");
   assert.ok(!grid[r][c]||grid[r][c]===ch,"Inconsistent intersection letters");
   assert.ok(!directions[r][c].has(place.d),"Parallel words overlap");
   grid[r][c]=ch;directions[r][c].add(place.d);
  });
  proWords++;
 }
 for(const b of stage.bonus){
  assert.ok(!stage.words.includes(b),"Bonus duplicates target word");
  let remaining=[...stage.letters];
  for(const ch of b){const n=remaining.indexOf(ch);assert.ok(n>=0,"Impossible bonus word");remaining.splice(n,1)}
 }
}
console.log("Advanced word crossword validated:",proData.levels.length,"stages,",proWords,"intersecting targets.");

console.log("Kalamechin game validated:",levels.length,"stages,",answerCount,"solutions; JS syntax and site links OK.");
