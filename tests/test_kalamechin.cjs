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
for(const id of ["stageLabel","coins","targets","wheel","path","submit","hint","win","continue"]){
 assert.ok(html.includes('id="'+id+'"'),"Missing UI element "+id);
}
console.log("Kalamechin game validated:",levels.length,"stages,",answerCount,"solutions; JS syntax and site links OK.");
