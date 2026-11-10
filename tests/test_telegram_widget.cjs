"use strict";
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"../telegram/widget-7x7.html"),"utf8");
assert.ok(Buffer.byteLength(html,"utf8")<=32768);
assert.ok(zlib.deflateSync(Buffer.from(html,"utf8"),{level:9}).length<=4096,"Telegram widget must fit 4KiB compressed");
const rows=JSON.parse(html.match(/const G=(\[[^;]+\]),C=/)[1]);
const clues=JSON.parse(html.match(/,C=(\{.*?\}),N=7/)[1]);
assert.equal(rows.length,7);
assert.ok(rows.every(r=>Array.from(r).length===7));
const entryList=[],seen=new Set(),covered=new Set();
for(const dir of ["horizontal","vertical"])for(let k=0;k<7;k++){
 let word="",cells=[],part=0;
 for(let j=0;j<=7;j++){
  const r=dir==="horizontal"?k:j,c=dir==="horizontal"?6-j:6-k;
  if(j===7||rows[r][c]==="#"){
   if(word){
    assert.ok(clues[dir][String(k+1)]?.[part++],"Missing clue for word");
    assert.ok(!seen.has(word),"Repeated word");
    seen.add(word);entryList.push(word);word="";cells=[];
   }
  }else{word+=rows[r][c];covered.add(r+","+c);cells.push([r,c])}
 }
}
const white=rows.join("").replaceAll("#","").length;
assert.equal(covered.size,white);
assert.equal(entryList.length,22);
assert.equal(white,39);
console.log("Telegram-native crossword: valid 7x7, 22 clues, compressed size:",zlib.deflateSync(Buffer.from(html),{level:9}).length);
