/* Read-only public Persian clue-in-cell player; never edits published solutions. */
(function(root){
'use strict';
const model=typeof module!=='undefined'&&module.exports?require('./clue-in-cell.js'):root.PayameClueInCell;
const fmt=new Intl.NumberFormat('fa-IR');
const coord=(r,c)=>r+','+c;
const create=(tag,klass,value)=>{
 const el=document.createElement(tag);
 if(klass)el.className=klass;
 if(value!==undefined)el.textContent=value;
 return el;
};
function progress(item,values){
 const grid=item.puzzle.grid;
 let correct=0,filled=0,total=0;
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){
  const cell=grid[r][c];if(cell.kind!=='letter')continue;
  total++;
  const char=model.normalize(values[coord(r,c)]||'').slice(0,1);
  if(char){filled++;if(char===cell.answer)correct++;}
 }
 return {correct,filled,total,solved:correct===total};
}
function createPlayer(container,item){
 if(!model.validate(item))throw Error('جدول شرح در متن کامل یا تأییدشده نیست.');
 container.replaceChildren();container.classList.add('clue-in-cell-game');
 const size=model.sizes[item.variant],grid=item.puzzle.grid;
 const wrapper=create('div','clue-game-scroll'),board=create('div','clue-game-board');
 board.style.gridTemplateColumns='repeat('+size.width+',34px)';
 board.setAttribute('role','grid');
 board.setAttribute('aria-label','شبکهٔ شرح در متن '+size.label);
 const description=create('p','muted small','روی خانهٔ سؤال و فلش آن بزن؛ سپس حروف جواب را در مسیر مشخص وارد کن. برای دیدن متن کامل سؤال، آن را انتخاب کن.');
 const instruction=create('p','clue-game-instruction','برای شروع یکی از خانه‌های سؤال را انتخاب کن.');
 instruction.setAttribute('role','status');
 const toolbar=create('div','play-toolbar'),check=create('button','action-button','بررسی'),reset=create('button','action-button secondary','شروع دوباره'),reveal=create('button','action-button secondary','نمایش پاسخنامه');
 for(const b of [check,reset,reveal])b.type='button';
 toolbar.append(check,reset,reveal);
 const meter=create('p','play-progress','');
 const cells=new Map(),values={},given=new Map(),savedKey='payamejadval:clue-progress:'+item.id;
 let active=null,revealed=false;
 try{
  const saved=JSON.parse(localStorage.getItem(savedKey)||'{}');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved))
   for(const [key,value] of Object.entries(saved))if(model.normalize(value).length===1)values[key]=model.normalize(value);
 }catch(_){}
 function store(){try{localStorage.setItem(savedKey,JSON.stringify(values));}catch(_){}}
 function paint(){
  for(const [key,el] of cells){
   const val=revealed?given.get(key):values[key]||'';
   el.value=val||'';el.readOnly=revealed;
  }
  const p=progress(item,revealed?Object.fromEntries(given):values);
  meter.textContent=fmt.format(p.filled)+' از '+fmt.format(p.total)+' خانه پُر شده است.';
 }
 function highlight(entry){
  active=entry;
  for(const el of cells.values())el.classList.remove('clue-active');
  for(const pos of model.positions(entry)){
   const el=cells.get(coord(pos.row,pos.col));
   if(el)el.classList.add('clue-active');
  }
  instruction.textContent=(entry.direction==='across'?'← افقی: ':'↓ عمودی: ')+entry.clue+
   ' ('+fmt.format([...entry.answer].length)+' حرف)';
  const first=model.positions(entry)[0],el=first&&cells.get(coord(first.row,first.col));
  if(el)el.focus();
 }
 for(let r=0;r<size.height;r++)for(let c=0;c<size.width;c++){
  const cell=grid[r][c],key=coord(r,c);
  if(cell.kind==='letter'){
   const input=create('input','clue-game-cell clue-letter');
   input.type='text';input.inputMode='text';input.maxLength=1;input.autocomplete='off';
   input.setAttribute('aria-label','سطر '+fmt.format(r+1)+' ستون '+fmt.format(size.width-c));
   input.addEventListener('input',()=>{
    if(revealed)return;
    const val=model.normalize(input.value).slice(0,1);input.value=val;
    if(val)values[key]=val;else delete values[key];
    store();paint();
    if(active&&val){
     const locations=model.positions(active);
     const idx=locations.findIndex(pos=>coord(pos.row,pos.col)===key);
     const next=locations[idx+1]&&cells.get(coord(locations[idx+1].row,locations[idx+1].col));
     if(next)next.focus();
    }
   });
   input.addEventListener('keydown',event=>{
    if(event.key==='Backspace'&&!input.value&&active){
     const positions=model.positions(active),idx=positions.findIndex(pos=>coord(pos.row,pos.col)===key);
     const previous=positions[idx-1]&&cells.get(coord(positions[idx-1].row,positions[idx-1].col));
     if(previous){event.preventDefault();previous.focus();}
    }
   });
   input.addEventListener('focus',()=>{
    const entry=item.puzzle.entries.find(e=>model.positions(e).some(p=>p.row===r&&p.col===c));
    if(entry&&(!active||!model.positions(active).some(p=>p.row===r&&p.col===c)))highlight(entry);
   });
   cells.set(key,input);given.set(key,cell.answer);board.append(input);
  }else if(cell.kind==='block'){
   const box=create('div','clue-game-cell clue-block');box.setAttribute('aria-hidden','true');board.append(box);
  }else if(cell.kind==='clue'){
   const box=create('div','clue-game-cell clue-question'+(cell.clueIds.length===2?' double-clue':''));
   for(const id of cell.clueIds){
    const e=item.puzzle.entries.find(x=>x.id===id);
    if(!e)continue;
    const btn=create('button','clue-question-part',(e.shortClue||e.clue)+' '+(e.direction==='across'?'←':'↓'));
    btn.type='button';btn.title=e.clue;
    btn.setAttribute('aria-label',e.clue+'، '+(e.direction==='across'?'افقی':'عمودی'));
    btn.addEventListener('click',()=>highlight(e));
    box.append(btn);
   }
   board.append(box);
  }else throw Error('خانهٔ تعیین‌تکلیف‌نشده در جدول منتشرشده مجاز نیست.');
 }
 function count(){const p=progress(item,values);if(p.solved)instruction.textContent='تبریک! این جدول را کامل و درست حل کردی.';return p;}
 check.addEventListener('click',()=>{
  const p=count();instruction.textContent=p.solved?'تبریک! تمام حروف صحیح هستند.':
   fmt.format(p.correct)+' حرف صحیح از '+fmt.format(p.filled)+' حرف واردشده؛ '+fmt.format(p.total-p.filled)+' خانه باقی مانده است.';
 });
 reset.addEventListener('click',()=>{
  if(!confirm('تمام پاسخ‌های این جدول پاک شوند؟'))return;
  for(const k of Object.keys(values))delete values[k];
  revealed=false;active=null;store();paint();
  instruction.textContent='جدول از ابتدا آمادهٔ حل است.';
 });
 reveal.addEventListener('click',()=>{
  if(!revealed&&!confirm('پاسخ کامل جدول را نمایش دهم؟'))return;
  revealed=!revealed;paint();
  reveal.textContent=revealed?'بازگشت به پاسخ‌های من':'نمایش پاسخنامه';
  instruction.textContent=revealed?'پاسخنامه نمایش داده شد.':'پاسخ‌های قبلی تو دوباره نمایش داده شدند.';
 });
 wrapper.append(board);container.append(description,toolbar,meter,instruction,wrapper);
 paint();return {values,cells,progress:()=>progress(item,values)};
}
const api={createPlayer,progress};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.PayameCluePlayer=api;
})(typeof window!=='undefined'?window:null);
