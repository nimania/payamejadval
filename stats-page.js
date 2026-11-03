/* Public aggregate-only dashboard; the private lexicon is never queried. */
(function(){
'use strict';
const $=id=>document.getElementById(id),fmt=new Intl.NumberFormat('fa-IR');
const player=window.PayamePlayer,metrics=window.PayameMetrics;
const config=window.PAYAMEJADVAL_FIREBASE_CONFIG||{};
const SDK='https://www.gstatic.com/firebasejs/12.19.0/';
const node=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;if(cls)x.className=cls;return x;};
function writeKpi(parent,label,value){
 const card=node('div',undefined,'kpi');card.append(node('b',fmt.format(value)),node('span',label));parent.append(card);
}
function renderStats(stats){
 if(!stats||stats.schema!==1||!Number.isInteger(stats.totalEntries))throw Error('فایل آمار معتبر نیست.');
 $('snapshotStatus').textContent='تاریخ آخرین نسخهٔ عددی: '+stats.snapshotAt+
  ' — '+stats.dataStatusLabel+'. اعداد بانک، دادهٔ لحظه‌ای سرور نیستند.';
 const kpi=$('bankKpis');kpi.replaceChildren();
 for(const [title,val] of [['مدخل غیرتکراری',stats.totalEntries],
  ['جواب یکتا',stats.uniqueAnswers],['سؤال یکتا',stats.uniqueClues],
  ['ترکیب سؤال+جواب یکتا',stats.uniquePairs]])writeKpi(kpi,title,val);
 $('bankLineage').textContent=stats.dataStatus==='live-aggregate'?
  'بانک مرکزی: '+fmt.format(stats.rawEntries)+' رکورد ثبت‌شده، '+fmt.format(stats.duplicateEntries)+
  ' تکراری کامل، '+fmt.format(stats.totalEntries)+' مدخل یکتا. '+
  'جدول توزیع طول‌ها از نسخهٔ آفلاینِ '+(stats.lengthsSnapshotAt||'قبلی')+' است و ممکن است هنوز با بانک زنده منطبق نباشد.':
  'فایل اصلی: '+fmt.format(stats.originalEntries)+' مدخل؛ '+fmt.format(stats.originalDuplicatesRemoved)+
  ' مورد تکراری کامل کنار گذاشته شد. از '+fmt.format(stats.intakeRows)+
  ' مدخل تصویری، '+fmt.format(stats.intakeDuplicatesSkipped)+
  ' تکراری بودند و '+fmt.format(stats.intakeAdded)+' مدخل تازه در نسخهٔ پالایش‌شده منظور شده‌اند.';
 const tbl=node('table'),head=node('thead'),row=node('tr');
 for(const h of ['تعداد حرف','کل مدخل‌های این طول','جواب یکتا','فراوانی'])row.append(node('th',h));
 head.append(row);tbl.append(head);
 const body=node('tbody');
 const max=Math.max(...stats.lengths.map(x=>x.entries),1);
 for(const it of stats.lengths){
  const r=node('tr');
  for(const v of [it.length,it.entries,it.uniqueAnswers])r.append(node('td',fmt.format(v)));
  const d=node('td'),bar=node('span',undefined,'bar');bar.style.width=(Math.max(2,it.entries/max*100))+'%';
  d.append(bar);r.append(d);body.append(r);
 }
 tbl.append(body);$('lengths').replaceChildren(tbl);
}
function valid(item){
 return !!item&&item.puzzle?.meta?.status==='published'&&item.puzzle?.meta?.method==='editor-approved'&&
  player.validateItem(item)&&!!window.JadvalQuality?.audit(item.puzzle)?.technicalPassed;
}
function fromFirestore(d){
 const v=d.data();try{return {id:v.id||d.id,title:v.title,type:'crossword',
  publishedAt:v.publishedAt,puzzle:JSON.parse(v.puzzleJson)};}catch(_){return null;}
}
async function getPuzzles(){
 const [a,b]=await Promise.allSettled([
  fetch('./data/published.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('آرشیو ثابت در دسترس نیست');return r.json()}),
  (async()=>{
   if(!['apiKey','authDomain','projectId','appId'].every(k=>config[k]))return [];
   const [app,fs]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-firestore.js')]);
   const application=app.getApps().find(x=>x.name==='payamejadval-stats')||
    app.initializeApp(config,'payamejadval-stats');
   const query=fs.query(fs.collection(fs.getFirestore(application),'publishedPuzzles'),
    fs.orderBy('publishedAt','desc'),fs.limit(250));
   const docs=await fs.getDocs(query);return docs.docs.map(fromFirestore).filter(Boolean);
  })()
 ]);
 const merged=new Map();
 if(a.status==='fulfilled')for(const x of a.value.puzzles||[])if(valid(x))merged.set(x.id,x);
 if(b.status==='fulfilled')for(const x of b.value)if(valid(x))merged.set(x.id,x);
 const ms=v=>v?.publishedAt?.toMillis?v.publishedAt.toMillis():Date.parse(v?.publishedAt||'')||0;
 const list=[...merged.values()].sort((x,y)=>ms(y)-ms(x));
 return {list,live:b.status==='fulfilled',hasStatic:a.status==='fulfilled'};
}
async function getAggregate(){
 const response=await fetch('./data/bank-stats.json',{cache:'no-store'});
 if(!response.ok)throw Error('فایل آمار بانک در دسترس نیست.');
 const offline=await response.json();
 if(!['apiKey','authDomain','projectId','appId'].every(k=>config[k]))return offline;
 try{
  const [app,fs]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-firestore.js')]);
  const application=app.getApps().find(x=>x.name==='payamejadval-stats')||
   app.initializeApp(config,'payamejadval-stats');
  const bank=await fs.getDoc(fs.doc(fs.getFirestore(application),'publicStats','bank'));
  if(!bank.exists())return offline;
  const v=bank.data();
  if(v.schema!==1||v.source!=='jadval-studio'||!Number.isInteger(v.rawEntries)||
     v.totalEntries!==v.uniquePairs||v.rawEntries-v.duplicateEntries!==v.totalEntries)return offline;
  return {...offline,...v, snapshotAt:v.snapshotAt?.toDate?.()?.toISOString()||offline.snapshotAt,
   dataStatus:'live-aggregate',lengthsSnapshotAt:offline.snapshotAt,
   dataStatusLabel:'آمار زندهٔ تجمیعی از بانک خصوصی توسط مدیر منتشر شده است؛ جزئیات واژگان خصوصی‌اند.'};
 }catch(_){return offline}
}
function formatPercent(percent){return fmt.format(percent)+'٪';}
function renderPublished({list,live,hasStatic}){
 $('archiveStatus').textContent='جدول‌های قابل بررسی در آرشیو: '+fmt.format(list.length)+
  (live?' (شامل دادهٔ منتشرشدهٔ آنلاین)':' (فقط آرشیو ثابت؛ ارتباط آنلاین در دسترس نیست)')+
  '. با کمتر از ۱۰، ۳۰ یا ۱۰۰ جدول قدیمی‌تر، تعداد واقعی مقایسه ذکر می‌شود.';
 const host=$('recentComparisons');host.replaceChildren();
 if(!list.length){host.append(node('p','هنوز جدول تأییدشده‌ای برای مقایسه در دسترس نیست.','muted'));return;}
 const tbl=node('table'),head=node('thead'),r=node('tr');
 for(const h of ['جدول','بازه','تعداد واقعی جدول‌های قدیمی‌تر','تکرار دقیق سؤال+جواب','تکرار فقط جواب'])r.append(node('th',h));
 head.append(r);tbl.append(head);
 const body=node('tbody');
 for(const [i,item] of list.slice(0,20).entries()){
  const all=metrics.windows(item,list,player);
  for(const w of all){
   const tr=node('tr'),name=node('td');
   const link=node('a',item.title);link.href='./?id='+encodeURIComponent(item.id);name.append(link);tr.append(name);
   tr.append(node('td','آخرین '+fmt.format(w.requested)));
   tr.append(node('td',fmt.format(w.actual)));
   tr.append(node('td',formatPercent(w.exactPct)+' ('+fmt.format(w.exact)+' از '+fmt.format(w.total)+')'));
   tr.append(node('td',formatPercent(w.answerPct)+' ('+fmt.format(w.answers)+' از '+fmt.format(w.total)+')'));
   body.append(tr);
  }
 }
 tbl.append(body);host.append(tbl);
 if(list.length>=250)host.append(node('p','حداکثر ۲۵۰ جدول اخیر برای این گزارش دریافت شده‌اند؛ آمار دوره‌های قدیمی‌تر ممکن است ناقص باشد.','muted'));
}
(async()=>{
 try{
  renderStats(await getAggregate());
 }catch(err){$('snapshotStatus').textContent='آمار تجمیعی فعلاً در دسترس نیست: '+err.message;}
 try{renderPublished(await getPuzzles());}
 catch(err){$('archiveStatus').textContent='بازیابی جدول‌ها برای گزارش تکرار ممکن نشد: '+err.message;}
})();
})();
