"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const code=fs.readFileSync(path.join(__dirname,"../telegram/google-apps-script/Code.gs"),"utf8");
const props=new Map([["TELEGRAM_CROSSWORD_BOT_TOKEN","1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"]]),calls=[],triggers=[];
const storage={
 getProperty:k=>props.get(k)||null,
 setProperty:(k,v)=>{props.set(k,v);return storage},
 deleteProperty:k=>props.delete(k)
};
function sheet(name) {
 const rows=[];
 const instance={
  name,rows,
  setName(n){this.name=n;return this},
  appendRow(a){rows.push([...a]);return this},
  getDataRange(){return {getValues:()=>rows.map(x=>[...x])}},
  deleteRow(i){rows.splice(i-1,1)},
  setFrozenRows(){return this},
  setColumnWidth(){return this},
  setColumnWidths(){return this},
  getRange(a,row,col,size){return{
   setBackground(){return this},setFontColor(){return this},setFontWeight(){return this},
   setValues(matrix){const first=typeof a==="string"?Number((a.match(/[0-9]+/)||["1"])[0]):a;
    while(rows.length<first+matrix.length-1)rows.push([]);
    matrix.forEach((x,i)=>{rows[first-1+i]=[...x]});return this},
   clearContent(){if(typeof a==="number"){for(let i=0;i<size;i++)for(let j=0;j<col;j++)rows[a-1+i][row-1+j]=''}return this}
  }}
 };
 return instance;
}
const ev=sheet("Sheet1"),report=sheet("داشبورد");
const book={
 setSpreadsheetTimeZone(v){assert.equal(v,"Asia/Tehran");return this},
 getActiveSheet:()=>ev,insertSheet:n=>(assert.equal(n,"داشبورد"),report),
 getId:()=>"fake-google-sheet-id",getUrl:()=>"https://docs.google.com/spreadsheets/d/fake-google-sheet-id/edit",
 getSheetByName:n=>n==="رویدادها"?ev:report
};
const scriptApp={
 getProjectTriggers:()=>triggers,
 deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1),
 newTrigger:name=>({timeBased(){return this},everyDays(n){assert.equal(n,1);return this},
  everyMinutes(){return this},create(){triggers.push({getHandlerFunction:()=>name})}})
};
const digest=s=>Array.from(crypto.createHash("sha256").update(s).digest()).map(x=>x<128?x:x-256);
const ctx={
 PropertiesService:{getScriptProperties:()=>storage},
 Utilities:{DigestAlgorithm:{SHA_256:"SHA_256"},computeDigest:(_alg,s)=>digest(s),getUuid:()=>"fake-analytics-private-salt",
 formatDate:()=> "2026-11-11 14:05:10"},
 SpreadsheetApp:{create:name=>(assert.ok(name.includes("پیام جدول")),book),openById:id=>(assert.equal(id,"fake-google-sheet-id"),book)},
 ScriptApp:scriptApp,
 UrlFetchApp:{fetch:(url,opt)=>{
  const method=url.split("/").pop();calls.push({method,payload:JSON.parse(opt.payload||"{}")});
  return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,result:{message_id:1}})};
 }},
 Date,console
};
vm.createContext(ctx);new vm.Script(code).runInContext(ctx);
ctx.setupAnalytics();
assert.equal(props.get("PJ_ANALYTICS_SHEET_ID"),"fake-google-sheet-id");
assert.equal(triggers.filter(t=>t.getHandlerFunction()==="purgeOldAnalytics").length,1);
assert.equal(ev.rows.length,1);
assert.equal(report.rows.length,13);
const user={from:{id:123,username:"test_user",first_name:"Test",last_name:"Person"},chat:{id:123,type:"private"},text:"/start"};
ctx.pjHandle_(user);
assert.equal(ev.rows.length,2);
assert.equal(ev.rows[1][3],"start");
assert.equal(ev.rows[1][5],"","Names not recorded without opt-in");
assert.equal(ev.rows[1][6],"","Usernames not recorded without opt-in");
assert.notEqual(ev.rows[1][2],"123","Raw Telegram id not stored");
ctx.pjHandle_({...user,text:"/showname"});
ctx.pjHandle_({...user,text:"/start"});
assert.equal(ev.rows[2][5],"Test Person");
assert.equal(ev.rows[2][6],"test_user");
ctx.pjHandle_({...user,text:"/hidename"});
assert.equal(ev.rows[2][5],"");
assert.equal(ev.rows[2][6],"");
ctx.pjHandle_({...user,text:"/forgetme"});
assert.equal(ev.rows.length,1,"Deleting account removes all previous events");
ctx.pjHandle_(user);
assert.equal(ev.rows.length,1,"Opted-out user should not be logged");
assert.ok(calls.some(x=>x.method==="sendMessage"));
console.log("Private analytics: creation, anonymized usage, name consent, scrubbing and deletion passed.");
