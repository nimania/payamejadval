"use strict";
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),data=JSON.parse(fs.readFileSync(path.join(root,"telegram/catalog.json"),"utf8"));
assert.equal(data.schema,1);
assert.equal(data.schedule.timezone,"Asia/Tehran");
assert.equal(data.schedule.quick.size,5);
assert.equal(data.schedule.main.size,7);
assert.equal(data.schedule.friday.size,9);
const seenIds=new Set(),seenDays=new Set();
const minis=JSON.parse(fs.readFileSync(path.join(root,"data/mini-puzzles.json"),"utf8")).puzzles;
const approvals=new Set(minis.filter(p=>p.puzzle.meta.status==="published"&&p.puzzle.meta.method==="editor-approved").map(p=>p.id));
for(const p of data.puzzles){
 assert.match(p.id,/^[a-z0-9-]{4,64}$/);
 assert.ok(!seenIds.has(p.id),"Duplicate puzzle id: "+p.id);seenIds.add(p.id);
 assert.ok([5,7,9].includes(p.size));
 assert.equal(p.kind,"crossword");
 assert.ok(/^telegram\/[a-zA-Z0-9-]+\.html$/.test(p.path));
 const native=fs.readFileSync(path.join(root,p.path));
 assert.ok(native.byteLength<=32768);
 assert.ok(zlib.deflateSync(native,{level:9}).length<=4096,"Oversized widget: "+p.id);
 assert.ok(p.webUrl && p.webUrl.startsWith("https://nimania.github.io/payamejadval/"));
 const pageName=p.webUrl.split("/").pop();
 assert.ok(/^[a-zA-Z0-9-]+\.html$/.test(pageName));
 assert.ok(fs.existsSync(path.join(root,pageName)),"Missing exact web page "+pageName);
 if(p.status==="approved"){
   assert.equal(p.editorApproved,true);
   assert.match(p.publishDate,/^20\d{2}-\d\d-\d\d$/);
   const dayKey=p.size+"/"+p.publishDate;
   assert.ok(!seenDays.has(dayKey),"Two daily puzzles on the same track/date: "+dayKey);
   seenDays.add(dayKey);
   if(p.size===5) assert.ok(approvals.has(p.id),"Mini not from editorially approved public puzzles: "+p.id);
 }else{
   assert.equal(p.status,"private-trial","No unreviewed puzzle may be released as official");
   assert.equal(p.editorApproved,false);
   assert.ok(!p.publishDate,"Trial must never appear as an official dated release");
 }
}
console.log("Daily crossword catalogue reviewed: "+seenIds.size+" unique puzzles, "+seenDays.size+" release slots.");
