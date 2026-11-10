"use strict";
/*
 Temporary polling bridge for PayameJadvalBot. It is intentionally separate
 from other bots and skips any existing webhook. Telegram holds offsets.
 GitHub's 5-minute cron is best effort; this is NOT instant delivery.
*/
const TOKEN=process.env.TELEGRAM_CROSSWORD_BOT_TOKEN||"";
const SECRET=process.env.TELEGRAM_WEBHOOK_SECRET_FOR_BRIDGE||"bridge-internal-handler";
if (!TOKEN) throw Error("Missing dedicated TELEGRAM_CROSSWORD_BOT_TOKEN");
if (SECRET.length<12) throw Error("Temporary handler secret too short");
process.env.TELEGRAM_WEBHOOK_SECRET=SECRET;
const handler=require("../api/telegram-crossword.js");

const API="https://api.telegram.org/bot"+TOKEN+"/";
async function telegram(method,payload={}) {
 const response=await fetch(API+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(18000)});
 const result=await response.json();
 if (!response.ok||result.ok!==true) throw Error("Telegram "+method+" failed: "+String(result.description||response.status).replaceAll(TOKEN,"[redacted]"));
 return result.result;
}
function chatId(u) {
 const msg=u.message||{}, q=u.callback_query||{}, c=msg.chat||q.message?.chat||{};
 const sender=msg.from?.id||q.from?.id;
 return c.type==="private" && c.id===sender ? c.id : null;
}
function actionable(u) {
 const t=u.message?.text||"";
 if (/^\/(start|jadval|today|menu|new|scores|kalamechin|word)(?:@PayameJadvalBot)?(?:\s|$)/i.test(t)) return true;
 return ["🧩 جدول امروز","🎲 یک جدول متفاوت","🔤 کلمه‌چین","🏆 امتیازهای من","👥 دعوت دوستان"].includes(t);
}
function safeRecent(u) {
 const date=u.message?.date;
 return Number.isFinite(date) && Date.now()/1000-date>=0 && Date.now()/1000-date<7200;
}
async function processBatch(updates) {
 const perChat=new Map();
 for (const u of updates) {
  if (chatId(u)!==null && actionable(u) && safeRecent(u)) perChat.set(chatId(u),u);
 }
 for (const [chatIdValue,u] of perChat) {
  const response=await handler(
    {method:"POST",headers:{"x-telegram-bot-api-secret-token":SECRET},body:u},
    {status(code){this.code=code;return this},json(body){return {code:this.code,body}}}
  );
  if(response.code!==200||response.body.ok!==true) {
    throw Error("Private chat dispatch failed with HTTP "+response.code);
  }
  console.log("Processed one private crossword command.");
 }
}
async function main(){
 const me=await telegram("getMe");
 if (String(me.username||"").toLowerCase()!=="payamejadvalbot") throw Error("Refusing to use token belonging to a different bot");
 const info=await telegram("getWebhookInfo");
 if (info.url) {console.log("Live webhook is active. The scheduled polling bridge is inactive.");return;}
 console.log("No live webhook. Looking for private crossword commands.");
 let updates=await telegram("getUpdates",{limit:100,timeout:0,allowed_updates:["message"]});
 let batch=0,total=0;
 while(updates.length && batch<12) {
   await processBatch(updates);
   total+=updates.length;
   const offset=Math.max(...updates.map(u=>u.update_id))+1;
   updates=await telegram("getUpdates",{offset,limit:100,timeout:0,allowed_updates:["message"]});
   batch++;
 }
 console.log("Polling run completed. Updates acknowledged: "+total+".");
}
main().catch(err=>{console.error(String(err.message||err).replaceAll(TOKEN,"[redacted]"));process.exitCode=1});
