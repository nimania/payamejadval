"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");
process.env.TELEGRAM_CROSSWORD_BOT_TOKEN="test-placeholder-token";
process.env.TELEGRAM_WEBHOOK_SECRET="test-placeholder-secret";
const handler=require(path.join(__dirname,"../api/telegram-crossword.js"));
let calls=[];
global.fetch=async(url,options)=>{
  const method=url.split("/").pop();
  assert.ok(url.startsWith("https://api.telegram.org/bottest-placeholder-token/"));
  calls.push({method,payload:JSON.parse(options.body)});
  return {ok:true,json:async()=>({ok:true,result:{message_id:20}})};
};
async function deliver(body,secret="test-placeholder-secret"){
  let statusCode;
  const res={status(code){statusCode=code;return this},json(json){return {code:statusCode,body:json}}};
  return handler({method:"POST",headers:{"x-telegram-bot-api-secret-token":secret},body},res);
}
function message(text){return {message:{chat:{type:"private",id:11880},from:{id:11880},text}}}
function tap(data){return {callback_query:{id:"callback-id",data,from:{id:11880},message:{chat:{id:11880,type:"private"}}}}}
(async()=>{
  assert.equal((await deliver(message("/start"),"incorrect")).code,403);
  assert.equal(calls.length,0);
  assert.equal((await deliver(message("/start"))).code,200);
  assert.equal(calls[0].method,"sendMessage");
  assert.equal(calls[0].payload.reply_markup.inline_keyboard.flat().length,4);
  calls=[];
  assert.equal((await deliver(tap("pj:today"))).code,200);
  assert.deepEqual(calls.map(x=>x.method),["answerCallbackQuery","sendWidget"]);
  const widget=calls[1].payload;
  assert.ok(widget.html.includes("🧩 پیام جدول"));
  assert.equal(widget.chat_id,11880);
  assert.equal(widget.allow_queries,false);
  assert.equal(widget.is_shared,false);
  calls=[];
  assert.equal((await deliver(tap("pj:different"))).code,200);
  assert.equal(calls[1].method,"sendMessage");
  assert.match(calls[1].payload.text,/فقط یک جدول/);
  calls=[];
  assert.equal((await deliver(tap("pj:scores"))).code,200);
  assert.match(calls[1].payload.text,/هنوز رتبه‌بندی و امتیاز مرکزی فعال نشده/);
  calls=[];
  assert.equal((await deliver(tap("pj:invite"))).code,200);
  assert.ok(calls[1].payload.text.includes("https://t.me/PayameJadvalBot"));
  calls=[];
  await deliver({message:{chat:{type:"group",id:-123},from:{id:11880},text:"/start"}});
  assert.equal(calls.length,0,"Never send private game in group");
  console.log("Crossword private button menu tests passed.");
})().catch(err=>{console.error(err);process.exitCode=1});
