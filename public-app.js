/* Public catalogue: existing reviewed static archive + approved Firestore documents.
   No authentication and no access to the private question bank. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const player=window.PayamePlayer;
const base='./data/published.json';
const daily='./data/daily-games.json';
const config=window.PAYAMEJADVAL_FIREBASE_CONFIG||{};
const SDK='https://www.gstatic.com/firebasejs/12.19.0/';
const params=new URLSearchParams(location.search);
const requestedId=params.get('id');
const requestedType=params.get('type');
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
async function fetchDaily(){
 const response=await fetch(daily,{cache:'no-store'});
 if(!response.ok)throw Error('Daily games archive unavailable');
 const data=await response.json();
 return data.schema===1&&Array.isArray(data.items)?data.items:[];
}
function publishedDoc(doc){
 const raw=doc.data();
 try{
  const puzzle=JSON.parse(raw.puzzleJson);
  return {id:raw.id||doc.id,type:'crossword',title:raw.title,publishedAt:raw.publishedAt,puzzle};
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
 if(item?.type==='sudoku')return !!window.PayameSudoku?.validate(item);
 if(item?.type&&item.type!=='crossword')return false;
 if(!player?.validateItem(item))return false;
 if(item?.puzzle?.meta?.status!=='published'||item?.puzzle?.meta?.method!=='editor-approved')return false;
 const audit=window.JadvalQuality?.audit(item.puzzle);
 return !!audit?.technicalPassed&&!audit.errors.length;
}
const archiveTypes=Object.freeze([
 {id:'crossword',name:'جدول کلمات متقاطع کلاسیک',description:'جدول فارسی کلاسیک ۱۵×۱۵ با سؤال‌های افقی و عمودی',active:true},
 {id:'mini',name:'جدول مینی ۵×۵',description:'جدول کلمات متقاطع کوتاه و متنوع پنج‌درپنج',active:false},
 {id:'sudoku',name:'سودوکو',description:'سودوکو ۹×۹ در سه سطح آسان، متوسط و سخت؛ انتشار روزانه',active:true},
 {id:'sudoku-special',name:'سودوکوی ویژه',description:'گونهٔ ویژه بر اساس نمونهٔ تأییدشدهٔ نشریه',active:false},
 {id:'clue-horizontal',name:'شرح در متن افقی ۳۰×۲۰',description:'جدول با سؤال‌های تعبیه‌شده در خانه‌ها، طرح افقی',active:false},
 {id:'clue-vertical',name:'شرح در متن عمودی ۲۰×۱۴',description:'جدول با سؤال‌های تعبیه‌شده در خانه‌ها، طرح عمودی',active:false}
]);
function typeOf(item){return item?.type==='sudoku'?'sudoku':item?.type==='mini'?'mini':'crossword';}
function displayType(item){return typeOf(item)==='sudoku'?
 'سودوکو '+({easy:'آسان',medium:'متوسط',hard:'سخت'}[item.puzzle.difficulty]||''):
 typeOf(item)==='mini'?'جدول مینی ۵×۵':'جدول کلمات متقاطع کلاسیک';}

function renderTypeCatalog(items){
 const section=$('categories');if(!section)return;
 section.replaceChildren();section.classList.toggle('hidden',!!requestedType);
 if(requestedType)return;
 section.append(text('h2','انواع جدول‌ها و سرگرمی‌ها'));
 section.append(text('p','جدول کلمات متقاطع کلاسیک، سودوکوهای روزانه و قالب‌هایی که در ادامه تکمیل می‌شوند.','muted small'));
 const categories=text('div',undefined,'category-grid');
 for(const entry of archiveTypes){
  const card=text('article',undefined,'category-card'+(entry.active?'':' category-pending'));
  card.append(text('h3',entry.name),text('p',entry.description,'muted small'));
  const total=items.filter(x=>typeOf(x)===entry.id).length;
  card.append(text('p',entry.active?'آرشیو منتشرشده: '+new Intl.NumberFormat('fa-IR').format(total):'در حال آماده‌سازی','category-count'));
  if(entry.active){
   const link=text('a','مشاهدهٔ آرشیو','link');link.href='./?type='+entry.id;
   card.append(link);
  }
  categories.append(card);
 }
 section.append(categories);
}
function compactPuzzleTitle(item){
 const title=String(item?.title||'جدول کلمات متقاطع').trim();
 const number=title.match(/جدول\s*(?:شماره(?:ٔ|ه)?\s*)?([۰-۹٠-٩0-9]+)/);
 const date=title.match(/([۰-۹٠-٩0-9]{1,2})\s+(?:فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)\s+[۰-۹٠-٩0-9]{4}/);
 const size=item?.puzzle?.grid?.length;
 return (number?'جدول '+number[1]:title)+(date?' | '+date[0]:'')+(size?' | '+size+'×'+size:'');
}
function renderCatalog(items){
 document.body.classList.remove('is-solving-crossword','is-playing-sudoku');
 document.querySelector('.intro .play-nav')?.remove();
 const catalog=$('catalog');catalog.replaceChildren();
 const selected=archiveTypes.find(x=>x.id===requestedType);
 const visible=items.filter(x=>!requestedType||typeOf(x)===requestedType);
 $('player').classList.add('hidden');catalog.classList.remove('hidden');
 $('empty').classList.toggle('hidden',visible.length>0);
 renderTypeCatalog(items);
 $('title').textContent=selected? 'آرشیو '+selected.name :
  requestedType?'این دسته هنوز فعال نیست':'پیام جدول؛ سرگرمی‌ها و بازی‌های فکری';
 $('subtitle').textContent=selected?.description||'انواع جدول‌ها و بازی‌های فکری فارسی؛ آرشیو هر نوع سرگرمی مستقل است.';
 for(const item of visible){
  const card=text('article',undefined,'card');
  const heading=text('h2',item.title),label=text('span',displayType(item),'content-type');
  const dimensions=typeOf(item)==='sudoku'?'۹ × ۹':item.puzzle.grid.length+' × '+item.puzzle.grid.length;
  const metadata=text('p',dimensions+(item.publishedAt?'  •  '+dateLabel(item.publishedAt):''),'muted');
  const link=text('a','بازی آنلاین','link');link.href='./?id='+encodeURIComponent(item.id);
  card.append(label,heading,metadata,link);catalog.append(card);
 }
}
function renderSudokuPuzzle(item){
 document.body.classList.remove('is-solving-crossword');
 document.body.classList.add('is-playing-sudoku');
 $('catalog').classList.add('hidden');$('empty').classList.add('hidden');
 $('categories')?.classList.add('hidden');$('player').classList.remove('hidden');
 $('title').textContent=item.title;
 $('subtitle').textContent='سودوکو ۹×۹؛ هر عدد یک‌بار در هر ردیف، ستون و مربع ۳×۳';
 const section=$('player');section.replaceChildren();
 const bar=text('div',undefined,'play-nav');
 const back=text('a','آرشیو سودوکو','link compact-link');
 back.href='./?type=sudoku';
 const share=text('button','کپی لینک','action-button');
 share.type='button';share.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);share.textContent='کپی شد';}
  catch(_){share.textContent='نشانی را از مرورگر کپی کن';}
 });
 bar.append(back,share);section.append(bar);
 const game=text('div',undefined,'game-frame');section.append(game);
 window.PayameSudokuPlayer.createPlayer(game,item);
}
function renderPuzzle(item,archive=[]){
 if(item?.type==='sudoku')return renderSudokuPuzzle(item);
 document.body.classList.remove('is-playing-sudoku');
 document.body.classList.add('is-solving-crossword');
 $('catalog').classList.add('hidden');$('empty').classList.add('hidden');
 $('categories')?.classList.add('hidden');
 $('player').classList.remove('hidden');
 $('title').textContent=compactPuzzleTitle(item);
 $('title').title=item.title;
 $('subtitle').textContent='جدول کلمات متقاطع فارسی — افقی: راست به چپ | عمودی: بالا به پایین';
 const section=$('player');section.replaceChildren();
 const back=text('a','آرشیو','link compact-link');
 back.href='./?type=crossword';back.setAttribute('aria-label','بازگشت به آرشیو جدول‌های کلمات متقاطع');
 const share=text('button','کپی لینک','action-button');
 share.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);share.textContent='کپی شد';}
  catch(_){share.textContent='کپی نشد';}
 });
 const row=text('div',undefined,'play-nav');
 row.setAttribute('aria-label','ابزارهای سریع جدول');
 row.append(back,share);
 if(window.PayamePrintPDF){
  for(const [mode,label] of [['blank','PDF جدول'],['answers','PDF پاسخنامه']]){
   const button=text('button',label,'action-button secondary');
   button.type='button';
   button.setAttribute('aria-label',mode==='blank'?'دانلود PDF جدول بدون پاسخ':'دانلود PDF پاسخنامه');
   button.addEventListener('click',async()=>{
    button.disabled=true;
    const previous=button.textContent;
    button.textContent='در حال آماده‌سازی…';
    try{await window.PayamePrintPDF.download(item,mode,player);}
    catch(err){quickStatus.textContent='دانلود PDF ناموفق بود: '+err.message;}
    finally{button.textContent=previous;button.disabled=false;}
   });
   row.append(button);
  }
 }
 const quickStatus=text('span',undefined,'compact-export-status');
 quickStatus.setAttribute('role','status');row.append(quickStatus);
 document.querySelector('.intro .play-nav')?.remove();
 document.querySelector('.intro').append(row);
 const game=text('div',undefined,'game-frame');section.append(game);
 player.createPlayer(game,item);
 const printArea=text('section',undefined,'print-download-wrap');
 printArea.setAttribute('aria-label','دانلود فایل‌های چاپی جدول و پاسخنامه');
 window.PayamePrintPDF?.render(printArea,item,player);
 section.append(printArea);
 const dictionary=text('section',undefined,'dictionary-wrap');
 dictionary.setAttribute('aria-label','فرهنگ سؤال‌ها و جواب‌های این جدول');
 window.PayameGlossary?.render(dictionary,item,player);
 section.append(dictionary);
 if(window.PayameMetrics){
  const overlap=window.PayameMetrics.windows(item,archive,player);
  const panel=text('section',undefined,'novelty-panel');
  panel.append(text('h2','تازگی و میزان تکرار این جدول'));
  panel.append(text('p','تکرار دقیق یعنی همان سؤال و همان جواب؛ تکرار جواب به‌تنهایی جداگانه شمرده می‌شود. مقایسه با جدول‌های قدیمی‌تر است.','muted small'));
  const table=text('table',undefined,'novelty-table');
  const head=text('tr');
  for(const name of ['دوره','جدول‌های قابل مقایسه','تکرار دقیق','جواب تکراری'])head.append(text('th',name));
  table.append(head);
  for(const x of overlap){
   const line=text('tr');
   for(const value of ['آخرین '+new Intl.NumberFormat('fa-IR').format(x.requested),
    new Intl.NumberFormat('fa-IR').format(x.actual),
    new Intl.NumberFormat('fa-IR').format(x.exactPct)+'٪',
    new Intl.NumberFormat('fa-IR').format(x.answerPct)+'٪'])line.append(text('td',value));
   table.append(line);
  }
  panel.append(table);
  const link=text('a','دیدن آمار کامل بانک و جدول‌ها','link');link.href='./stats.html';panel.append(link);
  section.append(panel);
 }
}
async function start(){
 const status=$('archiveStatus');
 status.textContent='در حال دریافت جدول‌های منتشرشده…';
 const [staticResult,cloudResult,dailyResult]=await Promise.allSettled([fetchStatic(),fetchApproved(),fetchDaily()]);
 const merged=new Map();
 if(staticResult.status==='fulfilled')for(const item of staticResult.value)if(eligiblePublicPuzzle(item))merged.set(item.id,item);
 if(cloudResult.status==='fulfilled')for(const item of cloudResult.value)if(eligiblePublicPuzzle(item))merged.set(item.id,item);
 if(dailyResult.status==='fulfilled')for(const item of dailyResult.value)if(eligiblePublicPuzzle(item))merged.set(item.id,item);
 const items=[...merged.values()].sort((a,b)=>{
  const as=a.publishedAt?.seconds? a.publishedAt.seconds*1000 :Date.parse(a.publishedAt||0)||0;
  const bs=b.publishedAt?.seconds? b.publishedAt.seconds*1000 :Date.parse(b.publishedAt||0)||0;
  return bs-as;
 });
 if(cloudResult.status==='rejected'&&dailyResult.status==='rejected'){
  status.textContent='بخشی از آرشیو در دسترس نیست؛ بازی‌های ذخیره‌شدهٔ عمومی نمایش داده می‌شوند.';
 }else status.textContent=items.length?'تعداد بازی‌های منتشرشده: '+new Intl.NumberFormat('fa-IR').format(items.length):'';
 if(requestedId){
  const item=items.find(x=>x.id===requestedId);
  if(item){renderPuzzle(item,items);return}
  renderCatalog(items);
  $('title').textContent='این جدول در آرشیو عمومی پیدا نشد';
  $('subtitle').textContent='ممکن است انتشار هنوز تکمیل نشده باشد یا لینک نادرست باشد.';
 }else renderCatalog(items);
 if(staticResult.status==='rejected'&&cloudResult.status==='rejected'&&dailyResult.status==='rejected'){
  $('empty').classList.remove('hidden');
  $('empty').querySelector('p').textContent='آرشیو در دسترس نیست. لطفاً بعداً دوباره امتحان کن.';
 }
}
window.PayamePublic={eligiblePublicPuzzle,archiveTypes};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
