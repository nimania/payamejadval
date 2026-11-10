"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../telegram/google-apps-script/Code.gs"),"utf8");
const script=new vm.Script(source,{filename:"Code.gs"});
const store=new Map([["TELEGRAM_CROSSWORD_BOT_TOKEN","1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"]]);
const calls=[],remote=[],triggers=[],updates=[];
const data=JSON.parse(fs.readFileSync(path.join(__dirname,"../data/daily-games.json"),"utf8"));
const sudoku=data.items.find(x=>x.id==="sudoku-2026-11-11-easy");
const template=fs.readFileSync(path.join(__dirname,"../telegram/sudoku-widget-template.html"),"utf8");
const scriptProps={getProperty:k=>store.get(k)||null,setProperty:(k,v)=>{store.set(k,v);return scriptProps}};
const scriptApp={
 getProjectTriggers:()=>triggers,
 deleteTrigger:t=>{const i=triggers.indexOf(t);if(i>=0)triggers.splice(i,1)},
 newTrigger:name=>({timeBased(){return this},everyMinutes(n){assert.equal(n,1);return this},create(){const t={getHandlerFunction:()=>name};triggers.push(t);return t}})
};
let now=Math.floor(Date.now()/1000);
const fetch=(url,opt)=>{
 if(url.startsWith("https://api.telegram.org/bot")){
  const method=url.split("/").pop(),body=JSON.parse(opt.payload||"{}");
  calls.push({method,body});
  const ret={
   getMe:{username:"PayameJadvalBot"},
   getWebhookInfo:{url:""},
   setMyCommands:true,
   sendMessage:{message_id:1},
   sendWidget:{message_id:2}
  };
  if(method==="getUpdates"){
    ret.getUpdates=body.offset===-1?updates.slice(-1):updates.filter(x=>x.update_id>=(body.offset||0)).slice(0,body.limit||100);
  }
  assert.ok(method in ret,"Unknown Telegram method: "+method);
  return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,result:ret[method]})};
 }
 remote.push(url);
 if(url.endsWith("data/daily-games.json"))return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({schema:1,items:[{...sudoku,publishedAt:"2026-01-01T00:00:00+03:30"}]})};
 if(url.endsWith("sudoku-widget-template.html"))return {getResponseCode:()=>200,getContentText:()=>template};
 if(url.endsWith("catalog.json"))return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({schema:1,puzzles:[{
  id:"friends-7x7-2026-11-10",title:"آزمایشی",kind:"crossword",size:7,path:"telegram/widget-7x7.html",
  status:"private-trial",editorApproved:false,allowPrivateTrial:true
 }]})};
 if(url.endsWith("/widget-7x7.html"))return {getResponseCode:()=>200,getContentText:()=>"<h3>🧩 پیام جدول</h3><script>const G=[];</script>",getContent:()=>[1,2,3]};
 throw Error("Unexpected url: "+url);
};
const cache=new Map(),ctx={
 PropertiesService:{getScriptProperties:()=>scriptProps},
 UrlFetchApp:{fetch},
 CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v)})},
 Utilities:{formatDate:(_date,_tz,pattern)=>pattern==="yyyy-MM-dd"?"2026-11-11":"20261111"},
 ScriptApp:scriptApp,
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 Date,console,
};
vm.createContext(ctx);script.runInContext(ctx);
ctx.setupBot();assert.equal(triggers.length,1);
assert.equal(calls.filter(x=>x.method==="getMe").length,1);
updates.push({update_id:101,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"/start"}});
ctx.pollUpdates();assert.equal(store.get("PJ_NEXT_UPDATE_OFFSET"),"102");
assert.ok(calls.some(x=>x.method==="sendMessage" && x.body.reply_markup.keyboard.flat().length===7));
updates.push({update_id:102,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"🧩 جدول امروز"}});
ctx.pollUpdates();assert.equal(store.get("PJ_NEXT_UPDATE_OFFSET"),"103");
assert.ok(calls.some(x=>x.method==="sendWidget" && x.body.chat_id===456 && x.body.html.includes("const G=")));
updates.push({update_id:103,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"🎲 یک جدول متفاوت"}});
ctx.pollUpdates();assert.ok(calls.some(x=>x.method==="sendMessage"&&x.body.text.includes("جدول ۷×۷ دوم")));
updates.push({update_id:104,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"⚡ جدول سریع"}});
ctx.pollUpdates();assert.ok(calls.some(x=>x.method==="sendMessage" && x.body.text.includes("۵×۵")));
updates.push({update_id:105,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"📤 اشتراک‌گذاری"}});
ctx.pollUpdates();
assert.ok(calls.some(x=>x.method==="sendMessage" && x.body.text.includes("https://t.me/PayameJadvalBot?start=p_friends-7x7-2026-11-10")));
updates.push({update_id:106,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"/start p_friends-7x7-2026-11-10"}});
ctx.pollUpdates();
assert.equal(calls.filter(x=>x.method==="sendWidget").length,2,"Deep link sends exact approved-or-trial puzzle privately");
updates.push({update_id:107,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"🔢 سودوکو"}});
ctx.pollUpdates();
assert.ok(calls.some(x=>x.method==="sendMessage"&&x.body.text.includes("سطح سودوکوی امروز")));
updates.push({update_id:108,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"🔢 سودوکو آسان"}});
ctx.pollUpdates();
assert.ok(calls.some(x=>x.method==="sendWidget"&&x.body.html.includes('const Q=')&&x.body.html.includes(sudoku.puzzle.givens)));
updates.push({update_id:109,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"/start s_sudoku-2026-11-11-easy"}});
ctx.pollUpdates();
assert.equal(calls.filter(x=>x.method==="sendWidget").length,4,"Sudoku deep link sends exact verified game");
updates.push({update_id:110,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"/privacy"}});
ctx.pollUpdates();
assert.ok(calls.some(x=>x.method==="sendMessage"&&x.body.text.includes("شناسهٔ ناشناس")));
updates.push({update_id:111,message:{date:now,chat:{id:-123,type:"group"},from:{id:456},text:"/start"}});
const before=calls.length;ctx.pollUpdates();assert.equal(calls.slice(before).filter(x=>x.method==="sendMessage").length,0);
assert.ok(remote.some(x=>x.endsWith("catalog.json")));
ctx.stopBot();assert.equal(triggers.length,0);
console.log("Google Apps Script: 7-button game menu, real daily Sudoku, private crossword, deep links, privacy and polling passed.");
