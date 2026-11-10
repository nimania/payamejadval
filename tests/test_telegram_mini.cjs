"use strict";
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib"),assert=require("node:assert/strict");
const list=JSON.parse(fs.readFileSync(path.join(__dirname,"../data/mini-puzzles.json"),"utf8")).puzzles;
for(const p of list){
 assert.equal(p.puzzle.meta.method,"editor-approved","Do not promote unreviewed puzzles");
 assert.equal(p.puzzle.meta.status,"published","No draft mini puzzles");
 const html=fs.readFileSync(path.join(__dirname,"../telegram/widget-"+p.id+".html"),"utf8");
 const gz=zlib.deflateSync(Buffer.from(html,"utf8"),{level:9}).length;
 assert.ok(gz<=4096,"Widget compressed limit: "+p.id+" "+gz);
 assert.ok(Buffer.byteLength(html,"utf8")<=32768);
 const match=html.match(/const G=(\[[^;]+\]),C=(\{.*?\}),N=5,\$=/);
 assert.ok(match,"Missing native mini data: "+p.id);
 const rows=JSON.parse(match[1]),clues=JSON.parse(match[2]);
 assert.deepEqual(rows,p.puzzle.grid.map(r=>r.join("")),"Mini cell mismatch: "+p.id);
 assert.deepEqual(clues,p.puzzle.clues,"Mini clue mismatch: "+p.id);
 assert.ok(html.includes("https://t.me/PayameJadvalBot?start=p_"+p.id));
 assert.ok(html.includes("https://nimania.github.io/payamejadval/share-"+p.id+".html"));
 assert.ok(html.includes("TelegramWidget.copyText"),"Native widget must copy cross-platform challenge");
 const pub=fs.readFileSync(path.join(__dirname,"../share-"+p.id+".html"),"utf8");
 const payload=pub.match(/<script id="puzzleData" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(payload,"Web mini must contain original puzzle");
 const parsed=JSON.parse(payload[1]);
 assert.deepEqual(parsed.grid,p.puzzle.grid);
 assert.deepEqual(parsed.clues,p.puzzle.clues);
 assert.equal(parsed.meta.status,"published");
 let words=0;
 for(const dir of ["horizontal","vertical"]){for(let n=1;n<=5;n++){assert.equal(clues[dir][n].length,1);words++;}}
 assert.equal(words,10);
 console.log(p.id,"original editorially approved 5x5 preserved; compressed bytes",gz);
}
