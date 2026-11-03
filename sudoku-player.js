/* Lightweight accessible Sudoku player, independent of the crossword bank. */
(function(root){
'use strict';
const sudoku=typeof module!=='undefined'&&module.exports?require('./sudoku.js'):root.PayameSudoku;
const digit=x=>{
 const s=String(x||'').replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-0x06f0))
  .replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-0x0660));
 return /^[1-9]$/.test(s)?s:'0';
};
function progress(item,values){
 if(!sudoku.validate(item)||typeof values!=='string'||!/^[0-9]{81}$/.test(values))throw Error('بازی سودوکو معتبر نیست.');
 let filled=0,mistakes=0,empty=0;
 for(let i=0;i<81;i++){
  const cur=item.puzzle.givens[i]==='0'?values[i]:item.puzzle.givens[i];
  if(cur==='0')empty++;
  else {filled++;if(cur!==item.puzzle.solution[i])mistakes++;}
 }
 return {filled,empty,mistakes,solved:empty===0&&mistakes===0};
}
function createPlayer(container,item){
 if(!sudoku.validate(item))throw Error('سودوکوی منتشرشده معتبر نیست.');
 const p=item.puzzle,fmt=new Intl.NumberFormat('fa-IR');
 const el=(tag,className,value)=>{
  const x=document.createElement(tag);
  if(className)x.className=className;
  if(value!==undefined)x.textContent=value;
  return x;
 };
 container.replaceChildren();
 container.classList.add('sudoku-game');
 const description=el('p','muted small','هر سطر، ستون و مربع ۳×۳ باید عددهای ۱ تا ۹ را بدون تکرار داشته باشد. خانه‌های از پیش مشخص‌شده قابل تغییر نیستند.');
 const toolbar=el('div','play-toolbar'),status=el('p','play-message','');
 status.setAttribute('role','status');
 const check=el('button','action-button','بررسی پاسخ‌ها'),erase=el('button','action-button secondary','پاک‌کردن خانه'),reset=el('button','action-button secondary','شروع دوباره'),reveal=el('button','action-button secondary','نمایش پاسخ');
 for(const b of [check,erase,reset,reveal])b.type='button';
 toolbar.append(check,erase,reset,reveal);
 const board=el('div','sudoku-board');
 board.setAttribute('role','grid');board.setAttribute('aria-label','شبکه سودوکو ۹ در ۹');
 const cells=[];
 const savedKey='payamejadval-sudoku:'+item.id;
 let values=p.givens.split(''),selected=-1,revealed=false;
 try{
  const previous=JSON.parse(localStorage.getItem(savedKey)||'null');
  if(Array.isArray(previous)&&previous.length===81)
   values=values.map((v,i)=>v==='0'?digit(previous[i]):v);
 }catch(_){}
 function save(){try{localStorage.setItem(savedKey,JSON.stringify(values));}catch(_){}}
 function mark(i){
  selected=i;
  cells.forEach((x,index)=>x.classList.toggle('selected',index===i));
 }
 function paint(){
  for(let i=0;i<81;i++){
   const c=cells[i];c.value=values[i]==='0'?'':fmt.format(Number(values[i]));
   c.classList.toggle('user-entry',p.givens[i]==='0');
  }
  const x=progress(item,values.join(''));
  counter.textContent=fmt.format(x.filled)+' از ۸۱ خانه تکمیل شده است.';
  if(x.solved)status.textContent='تبریک! سودوکو را درست و کامل حل کردی.';
 }
 function write(i,number){
  if(i<0||p.givens[i]!=='0'||revealed)return;
  values[i]=digit(number);paint();save();
 }
 for(let i=0;i<81;i++){
  const row=Math.floor(i/9),col=i%9;
  const c=el('input','sudoku-cell');
  c.type='text';c.inputMode='numeric';c.maxLength=1;c.autocomplete='off';
  c.readOnly=p.givens[i]!=='0';
  c.setAttribute('aria-label','سطر '+fmt.format(row+1)+' ستون '+fmt.format(col+1));
  if(col===2||col===5)c.classList.add('sudoku-right-boundary');
  if(row===2||row===5)c.classList.add('sudoku-bottom-boundary');
  if(c.readOnly)c.classList.add('given');
  c.addEventListener('focus',()=>mark(i));
  c.addEventListener('click',()=>mark(i));
  c.addEventListener('input',()=>{write(i,c.value);});
  c.addEventListener('keydown',e=>{
   const deltas={ArrowRight:-1,ArrowLeft:1,ArrowUp:-9,ArrowDown:9};
   if(e.key in deltas){e.preventDefault();const next=i+deltas[e.key];if(next>=0&&next<81)cells[next].focus();}
   if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();write(i,'0');}
  });
  cells.push(c);board.append(c);
 }
 const numberpad=el('div','sudoku-numberpad');
 for(let number=1;number<=9;number++){
  const btn=el('button','action-button secondary',fmt.format(number));
  btn.type='button';btn.setAttribute('aria-label','واردکردن '+fmt.format(number));
  btn.addEventListener('click',()=>write(selected,String(number)));
  numberpad.append(btn);
 }
 erase.addEventListener('click',()=>write(selected,'0'));
 check.addEventListener('click',()=>{
  const x=progress(item,values.join(''));
  status.textContent=x.solved?'آفرین! همهٔ خانه‌ها درست هستند.':
   x.mistakes?fmt.format(x.mistakes)+' خانه اشتباه است.':
   'تا اینجا درست است؛ '+fmt.format(x.empty)+' خانه باقی مانده است.';
 });
 reset.addEventListener('click',()=>{
  values=p.givens.split('');revealed=false;paint();save();status.textContent='از نو شروع شد.';
 });
 reveal.addEventListener('click',()=>{
  if(revealed){status.textContent='پاسخ کامل نمایش داده شده است.';return;}
  if(!window.confirm('پاسخ کامل سودوکو نمایش داده شود؟'))return;
  values=p.solution.split('');revealed=true;paint();status.textContent='پاسخ کامل نمایش داده شد.';
 });
 const counter=el('p','play-progress');
 container.append(description,toolbar,counter,board,numberpad,status);
 paint();
}
const api={digit,progress,createPlayer};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.PayameSudokuPlayer=api;
})(typeof window!=='undefined'?window:null);
