"use strict";
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const template=fs.readFileSync(path.join(root,"telegram/sudoku-widget-template.html"),"utf8");
const items=JSON.parse(fs.readFileSync(path.join(root,"data/daily-games.json"),"utf8")).items.filter(x=>x.type==="sudoku");
assert.ok(items.length>=3,"Need at least three real Sudoku games");
for(const item of items){
 const p=item.puzzle;
 assert.match(item.id,/^sudoku-20\d\d-\d\d-\d\d-(easy|medium|hard)$/);
 assert.equal(p.quality.unique,true);
 assert.match(p.givens,/^[0-9]{81}$/);
 assert.match(p.solution,/^[1-9]{81}$/);
 const q={id:item.id,date:item.id.slice(7,17),title:item.title,givens:p.givens,solution:p.solution};
 const html=template.replace("__PUZZLE__",JSON.stringify(q));
 new vm.Script(html.match(/<script>([\s\S]+)<\/script>/)[1]);
 assert.ok(Buffer.byteLength(html,"utf8")<=32768,"HTML too big "+item.id);
 const zipped=zlib.deflateSync(Buffer.from(html,"utf8"),{level:9}).length;
 assert.ok(zipped<=4096,"Telegram compressed limit exceeded "+item.id+": "+zipped);
 assert.ok(html.includes('https://t.me/PayameJadvalBot?start=s_'));
 assert.ok(html.includes("TelegramWidget.copyText"),"Copy challenge link required");
 assert.ok(html.includes("TelegramWidget.openTelegramLink"),"Telegram invite link required");
}
console.log("Telegram Sudoku widget validated across "+items.length+" real games: script, HTML, compressed size, sharing.");
