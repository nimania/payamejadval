/* Public Persian crossword player. Only the explicitly published grid is read.
   Answers stay on the public client so the board can be checked offline. */
(function(root){
'use strict';
const letterPattern=/^[آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیؤئء]$/;
const cleanLetter=value=>String(value||'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064b-\u065f\u0670\s\u200c\u200d\-ـ]/g,'');
const cellKey=(r,c)=>r+','+c;
function slotsFor(grid){
 const n=grid?.length,slots=[];
 if(!Number.isInteger(n)||n<2||!grid.every(r=>Array.isArray(r)&&r.length===n))return null;
 for(const dir of ['horizontal','vertical']){
  if(dir==='horizontal'){
   for(let r=0;r<n;r++){
    let c=n-1;
    while(c>=0){
     if(!grid[r][c]){c--;continue}
     const cells=[];while(c>=0&&grid[r][c])cells.push([r,c--]);
     if(!cells.length)return null;
     slots.push({dir,group:r+1,cells,answer:cells.map(([y,x])=>grid[y][x]).join('')});
    }
   }
  }else{
   for(let c=n-1;c>=0;c--){
    let r=0;
    while(r<n){
     if(!grid[r][c]){r++;continue}
     const cells=[];while(r<n&&grid[r][c])cells.push([r++,c]);
     if(!cells.length)return null;
     slots.push({dir,group:n-c,cells,answer:cells.map(([y,x])=>grid[y][x]).join('')});
    }
   }
  }
 }
 const map=new Map();
 for(const s of slots)for(const [r,c] of s.cells)map.set(cellKey(r,c),(map.get(cellKey(r,c))||0)+1);
 if(grid.some((row,r)=>row.some((v,c)=>v&&!map.has(cellKey(r,c)))))return null;
 return slots;
}
function validateItem(item){
 const p=item?.puzzle,n=p?.grid?.length;
 if(typeof item?.id!=='string'||!item.id||typeof item.title!=='string'||!item.title.trim()||
    ![5,7,10,15,20].includes(n)||p?.version!==3)return false;
 const grid=p.grid;
 if(!grid.every(row=>Array.isArray(row)&&row.length===n&&row.every(ch=>
    typeof ch==='string'&&(ch===''||([...ch].length===1&&letterPattern.test(ch))))))return false;
 const slots=slotsFor(grid);if(!slots||slots.length===0)return false;
 if(!p.clues||typeof p.clues!=='object')return false;
 for(const dir of ['horizontal','vertical']){
  const grouped=new Map();
  for(const slot of slots.filter(s=>s.dir===dir)){
   const k=String(slot.group);grouped.set(k,(grouped.get(k)||0)+1);
  }
  const actual=p.clues[dir];
  if(!actual||typeof actual!=='object'||Array.isArray(actual)||
     Object.keys(actual).length!==grouped.size)return false;
  for(const [k,count] of grouped){
   if(!Array.isArray(actual[k])||actual[k].length!==count||
      actual[k].some(v=>typeof v!=='string'||!v.trim()))return false;
  }
 }
 return true;
}
function groupedClues(item,dir){
 const g=item.puzzle.clues[dir];
 return Object.keys(g).sort((a,b)=>Number(a)-Number(b)).map(k=>({number:Number(k),clues:g[k],
  text:new Intl.NumberFormat('fa-IR').format(Number(k))+' - '+g[k].join(' - ')}));
}
function createPlayer(container,item){
 if(!validateItem(item))throw Error('ساختار جدول منتشرشده معتبر نیست.');
 container.replaceChildren();
 const grid=item.puzzle.grid,n=grid.length,slots=slotsFor(grid);
 const fmt=new Intl.NumberFormat('fa-IR'),values=new Map(),cells=new Map(),clueItems=new Map();
 const persistedKey='payamejadval-play:'+item.id;
 let orientation='horizontal',active=null,revealed=false,savedBeforeReveal=null;
 const el=(tag,className,text)=>{const d=document.createElement(tag);if(className)d.className=className;if(text!==undefined)d.textContent=text;return d;};
 const banner=el('p','muted','برای جابه‌جایی بین افقی و عمودی، دکمهٔ جهت یا کلید Tab را بزن. پیشرفت در همین مرورگر ذخیره می‌شود.');
 const toolbar=el('div','play-toolbar');
 const across=el('button','direction-button active','افقی'),down=el('button','direction-button','عمودی');
 const check=el('button','action-button','بررسی پاسخ‌ها');
 const reveal=el('button','action-button secondary','نمایش جواب‌ها');
 const reset=el('button','action-button secondary','از نو');
 for(const b of [across,down,check,reveal,reset])b.type='button';
 toolbar.append(across,down,check,reveal,reset);
 const progress=el('p','play-progress',''),message=el('p','play-message','');
 message.setAttribute('role','status');
 const board=el('div','board');
 board.style.gridTemplateColumns='repeat('+(n+1)+',minmax(0,1fr))';
 board.setAttribute('role','grid');
 board.setAttribute('aria-label','جدول '+fmt.format(n)+' در '+fmt.format(n));
 function axis(number){const x=el('div','axis',number===null?'':fmt.format(number));return x;}
 board.append(axis(null));for(let c=1;c<=n;c++)board.append(axis(c));
 for(let r=0;r<n;r++){
  board.append(axis(r+1));
  for(let c=n-1;c>=0;c--){
   const outer=el('div','cell'+(!grid[r][c]?' block':''));
   outer.setAttribute('role','gridcell');
   if(grid[r][c]){
    const input=el('input','entry');
    input.type='text';input.maxLength=1;input.autocomplete='off';
    input.spellcheck=false;input.autocapitalize='none';
    input.setAttribute('aria-label','ردیف '+fmt.format(r+1)+'، ستون '+fmt.format(n-c));
    const key=cellKey(r,c);input.dataset.key=key;
    outer.append(input);values.set(key,'');cells.set(key,{outer,input,r,c});
   }
   board.append(outer);
  }
 }
 const selectedHint=el('p','selected-hint','');
 const clueWrap=el('div','clues');
 for(const [dir,label] of [['horizontal','افقی'],['vertical','عمودی']]){
  const sec=el('section','clue-section'),heading=el('h2','',label),list=el('ul','clue-list');
  for(const group of groupedClues(item,dir)){
   const li=el('li','clue-line');
   const b=el('button','clue-select',group.text);b.type='button';
   b.addEventListener('click',()=>{
    const matches=slots.filter(s=>s.dir===dir&&s.group===group.number);
    const index=matches.indexOf(active);
    orientation=dir;selectSlot(matches[(index+1)%matches.length],true);
   });
   li.append(b);list.append(li);clueItems.set(dir+':'+group.number,li);
  }
  sec.append(heading,list);clueWrap.append(sec);
 }
 const magazineMode=n===15;
 container.classList.toggle('magazine-crossword',magazineMode);
 container.classList.toggle('mini-crossword',n===5);
 const playArea=el('div',magazineMode?'magazine-play-area':'standard-play-area');
 const boardPane=el('div','magazine-board-pane');
 const cluePane=el('div','magazine-clue-pane');
 boardPane.append(selectedHint,board,message);
 cluePane.append(clueWrap);
 playArea.append(boardPane,cluePane);
 container.append(banner,toolbar,progress,playArea);
 try{
  const saved=JSON.parse(localStorage.getItem(persistedKey)||'{}');
  if(saved&&typeof saved==='object')for(const [key,v] of Object.entries(saved)){
   if(cells.has(key)&&letterPattern.test(cleanLetter(v)))cells.get(key).input.value=cleanLetter(v);
  }
 }catch(_){/* Storage may be unavailable in private browsing. */}
 function store(){
  if(revealed)return;
  const v={};
  for(const [key,c] of cells)v[key]=cleanLetter(c.input.value);
  try{localStorage.setItem(persistedKey,JSON.stringify(v))}catch(_){}
 }
 function updateProgress(){
  const filled=[...cells.values()].filter(c=>c.input.value).length;
  progress.textContent=fmt.format(filled)+' از '+fmt.format(cells.size)+' خانه تکمیل شده ('+
   fmt.format(Math.round(100*filled/cells.size))+'٪)';
 }
 function selectSlot(slot,focus=false,key=null){
  if(!slot)return;
  active=slot;orientation=slot.dir;
  across.classList.toggle('active',orientation==='horizontal');
  down.classList.toggle('active',orientation==='vertical');
  for(const c of cells.values())c.outer.classList.remove('selected');
  for(const li of clueItems.values())li.classList.remove('selected');
  for(const [r,c] of slot.cells)cells.get(cellKey(r,c)).outer.classList.add('selected');
  clueItems.get(slot.dir+':'+slot.group)?.classList.add('selected');
  const group=slots.filter(x=>x.dir===slot.dir&&x.group===slot.group);
  const pos=group.indexOf(slot),clue=item.puzzle.clues[slot.dir][String(slot.group)][pos];
  selectedHint.textContent=(slot.dir==='horizontal'?'افقی ':'عمودی ')+fmt.format(slot.group)+
   ' — پاسخ '+fmt.format(pos+1)+' از '+fmt.format(group.length)+' — '+clue;
  if(focus){const chosen=key&&slot.cells.some(([r,c])=>cellKey(r,c)===key)?key:cellKey(...slot.cells[0]);cells.get(chosen)?.input.focus();}
 }
 function slotAt(key,dir){return slots.find(s=>s.dir===dir&&s.cells.some(([r,c])=>cellKey(r,c)===key));}
 function focusCell(r,c){
  const entry=cells.get(cellKey(r,c));if(!entry)return false;
  entry.input.focus();return true;
 }
 function selectCell(key){
  let slot=slotAt(key,orientation);
  if(!slot){orientation=orientation==='horizontal'?'vertical':'horizontal';slot=slotAt(key,orientation)}
  selectSlot(slot,false,key);
 }
 for(const [key,c] of cells){
  const input=c.input;
  input.addEventListener('focus',()=>selectCell(key));
  input.addEventListener('input',()=>{
   if(revealed)return;
   let value=cleanLetter(input.value);value=[...value].slice(-1)[0]||'';
   input.value=letterPattern.test(value)?value:'';
   for(const v of cells.values())v.outer.classList.remove('incorrect','correct');
   message.textContent='';store();updateProgress();
   if(input.value&&active){
    const at=active.cells.findIndex(([r,col])=>cellKey(r,col)===key);
    const next=active.cells[at+1];if(next)focusCell(...next);
   }
  });
  input.addEventListener('keydown',e=>{
   if(revealed)return;
   if(e.key==='Tab'){
    e.preventDefault();
    const next=orientation==='horizontal'?'vertical':'horizontal';
    selectSlot(slotAt(key,next)||active,true,key);return;
   }
   if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)){
    e.preventDefault();
    const dr=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
    const dc=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
    focusCell(c.r+dr,c.c+dc);return;
   }
   if(e.key==='Backspace'&&!input.value&&active){
    const at=active.cells.findIndex(([r,col])=>cellKey(r,col)===key);
    if(at>0){e.preventDefault();const prev=active.cells[at-1];focusCell(...prev);}
   }
  });
 }
 function direction(dir){
  const key=document.activeElement?.dataset?.key;
  orientation=dir;
  const choice=key?slotAt(key,dir):null;
  selectSlot(choice||slots.find(s=>s.dir===dir),!!choice,key);
 }
 across.addEventListener('click',()=>direction('horizontal'));
 down.addEventListener('click',()=>direction('vertical'));
 check.addEventListener('click',()=>{
  if(revealed)return;
  let right=0,filled=0;
  for(const c of cells.values()){
   c.outer.classList.remove('correct','incorrect');
   const answer=grid[c.r][c.c],value=cleanLetter(c.input.value);
   if(value){filled++;const yes=value===answer;c.outer.classList.add(yes?'correct':'incorrect');if(yes)right++;}
  }
  message.textContent=filled===cells.size&&right===cells.size?
   'آفرین! جدول را کامل و بدون خطا حل کردی.':
   fmt.format(right)+' پاسخ درست از '+fmt.format(filled)+' خانهٔ پُرشده. خانه‌های نادرست مشخص شده‌اند.';
 });
 reveal.addEventListener('click',()=>{
  if(!revealed&&!confirm('تمام جواب‌های این جدول نمایش داده شوند؟'))return;
  if(!revealed){
   savedBeforeReveal=new Map([...cells].map(([key,c])=>[key,c.input.value]));
   for(const c of cells.values()){c.input.value=grid[c.r][c.c];c.input.disabled=true;}
   revealed=true;reveal.textContent='بازگشت به پاسخ‌های من';message.textContent='پاسخنامه نمایش داده شد.';
  }else{
   for(const [key,c] of cells){c.input.value=savedBeforeReveal.get(key)||'';c.input.disabled=false;}
   revealed=false;reveal.textContent='نمایش جواب‌ها';message.textContent='';
  }
  updateProgress();
 });
 reset.addEventListener('click',()=>{
  if(!confirm('همهٔ پاسخ‌های ذخیره‌شدهٔ این جدول پاک شوند؟'))return;
  revealed=false;
  for(const c of cells.values()){c.input.value='';c.input.disabled=false;c.outer.classList.remove('correct','incorrect');}
  savedBeforeReveal=null;reveal.textContent='نمایش جواب‌ها';message.textContent='';
  store();updateProgress();selectSlot(slots[0]);
 });
 selectSlot(slots[0]);updateProgress();
 return {slots,cells};
}
const api={slotsFor,validateItem,groupedClues,createPlayer,cleanLetter};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.PayamePlayer=api;
})(typeof window!=='undefined'?window:null);
