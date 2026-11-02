/* Public catalogue: existing reviewed static archive + approved Firestore documents.
   No authentication and no access to the private question bank. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const player=window.PayamePlayer;
const base='./data/published.json';
const config=window.PAYAMEJADVAL_FIREBASE_CONFIG||{};
const SDK='https://www.gstatic.com/firebasejs/12.19.0/';
const requestedId=new URLSearchParams(location.search).get('id');
function text(tag,content,className){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(content!==undefined)node.textContent=content;
 return node;
}
function dateLabel(value){
 try{
  if(value?.toDate)value=value.toDate();
  const date=value instanceof Date?value:new Date(value);
  return Number.isNaN(date.getTime())?'':date.toLocaleDateString('fa-IR',{year:'numeric',month:'long',day:'numeric'});
 }catch(_){return ''}
}
async function fetchStatic(){
 const response=await fetch(base,{cache:'no-store'});
 if(!response.ok)throw Error('Static archive unavailable');
 const result=await response.json();
 return Array.isArray(result.puzzles)?result.puzzles:[];
}
function publishedDoc(doc){
 const raw=doc.data();
 try{
  const puzzle=JSON.parse(raw.puzzleJson);
  return {id:raw.id||doc.id,title:raw.title,publishedAt:raw.publishedAt,puzzle};
 }catch(_){return null}
}
async function fetchApproved(){
 if(!['apiKey','authDomain','projectId','appId'].every(k=>typeof config[k]==='string'&&config[k]))throw Error('Cloud not configured');
 const [{initializeApp,getApps},fs]=await Promise.all([
  import(SDK+'firebase-app.js'),import(SDK+'firebase-firestore.js')]);
 const app=getApps().find(x=>x.name==='payamejadval-public')||initializeApp(config,'payamejadval-public');
 const db=fs.getFirestore(app);
 const collection=fs.collection(db,'publishedPuzzles');
 const q=fs.query(collection,fs.orderBy('publishedAt','desc'),fs.limit(100));
 const snapshot=await fs.getDocs(q),items=snapshot.docs.map(publishedDoc).filter(Boolean);
 if(requestedId&&!items.some(x=>x.id===requestedId)){
  const one=await fs.getDoc(fs.doc(db,'publishedPuzzles',requestedId));
  if(one.exists()){const parsed=publishedDoc(one);if(parsed)items.push(parsed)}
 }
 return items;
}
function eligiblePublicPuzzle(item){
 if(!player?.validateItem(item))return false;
 if(item?.puzzle?.meta?.status!=='published'||item?.puzzle?.meta?.method!=='editor-approved')return false;
 const audit=window.JadvalQuality?.audit(item.puzzle);
 return !!audit?.technicalPassed&&!audit.errors.length;
}
function renderCatalog(items){
 const catalog=$('catalog');catalog.replaceChildren();
 $('player').classList.add('hidden');catalog.classList.remove('hidden');
 $('empty').classList.toggle('hidden',items.length>0);
 const headline=$('title'),subtitle=$('subtitle');
 headline.textContent='جدول‌های تازه، هر بار چالشی نو';
 subtitle.textContent='جدول‌های فارسی منتشرشده و تأییدشده — قابل حل آنلاین';
 for(const item of items){
  const card=text('article',undefined,'card');
  const heading=text('h2',item.title);
  const metadata=text('p',(item.puzzle.grid.length+' × '+item.puzzle.grid.length)+
   (item.publishedAt?'  •  '+dateLabel(item.publishedAt):''),'muted');
  const link=text('a','حل آنلاین جدول','link');
  link.href='./?id='+encodeURIComponent(item.id);
  card.append(heading,metadata,link);catalog.append(card);
 }
}
function renderPuzzle(item){
 $('catalog').classList.add('hidden');$('empty').classList.add('hidden');
 $('player').classList.remove('hidden');
 $('title').textContent=item.title;
 $('subtitle').textContent='حل جدول فارسی — افقی از راست به چپ، عمودی از بالا به پایین';
 const section=$('player');section.replaceChildren();
 const back=text('a','بازگشت به فهرست جدول‌ها','link');
 back.href='./';back.style.marginBottom='14px';
 const share=text('button','کپی لینک این جدول','action-button');
 share.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);share.textContent='لینک کپی شد';}
  catch(_){share.textContent='آدرس این صفحه را از مرورگر کپی کن';}
 });
 const row=text('div',undefined,'play-nav');
 row.append(back,share);section.append(row);
 const game=text('div',undefined,'game-frame');section.append(game);
 player.createPlayer(game,item);
}
async function start(){
 const status=$('archiveStatus');
 status.textContent='در حال دریافت جدول‌های منتشرشده…';
 const [staticResult,cloudResult]=await Promise.allSettled([fetchStatic(),fetchApproved()]);
 const merged=new Map();
 if(staticResult.status==='fulfilled')for(const item of staticResult.value)if(eligiblePublicPuzzle(item))merged.set(item.id,item);
 if(cloudResult.status==='fulfilled')for(const item of cloudResult.value)if(eligiblePublicPuzzle(item))merged.set(item.id,item);
 const items=[...merged.values()].sort((a,b)=>{
  const as=a.publishedAt?.seconds? a.publishedAt.seconds*1000 :Date.parse(a.publishedAt||0)||0;
  const bs=b.publishedAt?.seconds? b.publishedAt.seconds*1000 :Date.parse(b.publishedAt||0)||0;
  return bs-as;
 });
 if(cloudResult.status==='rejected'){
  status.textContent='اتصال آرشیو آنلاین هنوز فعال یا در دسترس نیست؛ جدول‌های آرشیو ثابت نمایش داده می‌شوند.';
 }else status.textContent=items.length?'تعداد جدول‌های منتشرشده: '+new Intl.NumberFormat('fa-IR').format(items.length):'';
 if(requestedId){
  const item=items.find(x=>x.id===requestedId);
  if(item){renderPuzzle(item);return}
  renderCatalog(items);
  $('title').textContent='این جدول در آرشیو عمومی پیدا نشد';
  $('subtitle').textContent='ممکن است انتشار هنوز تکمیل نشده باشد یا لینک نادرست باشد.';
 }else renderCatalog(items);
 if(staticResult.status==='rejected'&&cloudResult.status==='rejected'){
  $('empty').classList.remove('hidden');
  $('empty').querySelector('p').textContent='آرشیو در دسترس نیست. لطفاً بعداً دوباره امتحان کن.';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
