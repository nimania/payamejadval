"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../telegram/google-apps-script/Code.gs"),"utf8");
const script=new vm.Script(source,{filename:"Code.gs"});
const store=new Map([["TELEGRAM_CROSSWORD_BOT_TOKEN","1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"]]);
const calls=[],remote=[],triggers=[],updates=[];
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
 Utilities:{formatDate:()=>"20261111"},
 ScriptApp:scriptApp,
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 Date,console,
};
vm.createContext(ctx);script.runInContext(ctx);
ctx.setupBot();assert.equal(triggers.length,1);
assert.equal(calls.filter(x=>x.method==="getMe").length,1);
updates.push({update_id:101,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"/start"}});
ctx.pollUpdates();assert.equal(store.get("PJ_NEXT_UPDATE_OFFSET"),"102");
assert.ok(calls.some(x=>x.method==="sendMessage" && x.body.reply_markup.keyboard.flat().length===4));
updates.push({update_id:102,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"🧩 جدول امروز"}});
ctx.pollUpdates();assert.equal(store.get("PJ_NEXT_UPDATE_OFFSET"),"103");
assert.ok(calls.some(x=>x.method==="sendWidget" && x.body.chat_id===456 && x.body.html.includes("const G=")));
updates.push({update_id:103,message:{date:now,chat:{id:456,type:"private"},from:{id:456},text:"🎲 یک جدول متفاوت"}});
ctx.pollUpdates();assert.ok(calls.some(x=>x.method==="sendMessage"&&x.body.text.includes("فعلاً فقط یک جدول")));
updates.push({update_id:104,message:{date:now,chat:{id:-123,type:"group"},from:{id:456},text:"/start"}});
const before=calls.length;ctx.pollUpdates();assert.equal(calls.slice(before).filter(x=>x.method==="sendMessage").length,0);
assert.ok(remote.some(x=>x.endsWith("catalog.json")));
ctx.stopBot();assert.equal(triggers.length,0);
console.log("Google Apps Script bot: syntax, safe setup, one-minute trigger, private menu, widget, catalogue, offset, and stop tests passed.");
