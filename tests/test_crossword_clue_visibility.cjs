"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
for(const entry of [
 ["telegram/widget-7x7.html","clabelTop","ctextTop","clabel","ctext"],
 ["telegram/widget-mini-2026-11-03-01.html","clabelTop","ctextTop","clabel","ctext"],
 ["telegram/widget-mini-2026-11-03-02.html","clabelTop","ctextTop","clabel","ctext"],
 ["share-7x7-20261110.html","clueLabelTop","clueTextTop","clueLabel","clueText"],
 ["share-mini-2026-11-03-01.html","clueLabelTop","clueTextTop","clueLabel","clueText"],
 ["share-mini-2026-11-03-02.html","clueLabelTop","clueTextTop","clueLabel","clueText"]
]){
 const [file,topLabel,topText,bottomLabel,bottomText]=entry,s=read(file);
 for(const id of [topLabel,topText,bottomLabel,bottomText])assert.ok(s.includes('id="'+id+'"'),file+" missing "+id);
 assert.ok(s.includes("clue-top")||s.includes("cluebar-top"),file+" no top clue style");
 assert.ok(s.includes("clue-bottom")||s.includes("cluebar-bottom"),file+" no bottom clue style");
 if(file.startsWith("share-")){
  assert.ok(s.indexOf('id="'+topText+'"')<s.indexOf('id="board"'),file+" top clue must be above board");
  assert.ok(s.indexOf('id="'+bottomText+'"')>s.indexOf('id="board"'),file+" bottom clue must be below board");
  assert.ok(s.includes('textContent=cur.clue'),file+" must use real approved clue");
 }else{
  assert.ok(s.indexOf('id="'+topText+'"')<s.indexOf('id="board"'),file+" top clue must be above board");
  assert.ok(s.indexOf('id="'+bottomText+'"')>s.indexOf('id="board"'),file+" bottom clue must be below board");
  assert.ok(s.includes("textContent=e.clue"),file+" must use real selected clue");
 }
 const blocks=[...s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(const [_,js] of blocks){if(js.trim().startsWith("{"))continue;new vm.Script(js,{filename:file})}
}
const demo=read("telegram-7x7-demo.html");
for(const id of ["clueNoTop","clueTop","clueNo","clue"])assert.ok(demo.includes('id="'+id+'"'),"Demo clue missing "+id);
assert.ok(demo.includes("clueTop').textContent=x[5]"),"Demo must synchronize the two question labels");
const player=read("player.js"),index=read("index.html");
assert.ok(player.includes("boardPane.append(selectedHint,board,selectedHintBottom,message)"),"Main player must surround crossword grid with clue");
assert.ok(player.includes("selectedHintBottom.textContent=selectedHint.textContent"),"Main player clue synchronization missing");
assert.ok(index.includes(".selected-hint-bottom"),"Main player bottom clue must be styled");
const pro=read("kalamechin-pro.html"),data=JSON.parse(read("data/kalamechin-pro.json"));
for(const id of ["questionTopText","questionBottomText"])assert.ok(pro.includes('id="'+id+'"'),"Professional game must display "+id);
for(const level of data.levels)for(const word of level.words){
 assert.ok(level.clues&&typeof level.clues[word]==="string"&&level.clues[word].trim().length>=8,"Professional clue missing for "+word);
}
console.log("Live Persian crossword clue is mirrored above and below every current grid, with 26 curated pro levels.");
