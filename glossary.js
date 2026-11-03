/* A readable question–answer lexicon for each explicitly published crossword.
   Derive answers directly from the public grid. Never download the private bank. */
(function(root){
'use strict';
const fmt=new Intl.NumberFormat('fa-IR');
function entries(item,player=root?.PayamePlayer){
 if(!player?.validateItem?.(item))throw Error('اطلاعات جدول منتشرشده معتبر نیست.');
 const slots=player.slotsFor(item.puzzle.grid);
 if(!slots?.length)throw Error('هیچ پاسخ قابل نمایش یافت نشد.');
 const offsets=new Map(),result={horizontal:[],vertical:[]};
 for(const slot of slots){
  const key=slot.dir+':'+slot.group,index=offsets.get(key)||0;
  const clues=item.puzzle.clues[slot.dir][String(slot.group)];
  const clue=clues?.[index];
  if(typeof clue!=='string'||!clue.trim()||!slot.answer)
   throw Error('تطبیق سؤال و پاسخ منتشرشده ناقص است.');
  offsets.set(key,index+1);
  result[slot.dir].push({
   direction:slot.dir,number:slot.group,part:index+1,total:clues.length,
   clue:clue.trim(),answer:slot.answer,length:[...slot.answer].length
  });
 }
 for(const dir of ['horizontal','vertical']){
  const groups=item.puzzle.clues[dir];
  for(const [number,clues] of Object.entries(groups))
   if(offsets.get(dir+':'+number)!==clues.length)
    throw Error('شمار سؤال‌ها با پاسخ‌های شبکه تطابق ندارد.');
 }
 return result;
}
function asText(grouped,item){
 const lines=['فرهنگ سؤال و جواب — '+item.title,''];
 for(const [dir,label] of [['horizontal','افقی'],['vertical','عمودی']]){
  lines.push(label);
  for(const entry of grouped[dir]){
   const number=fmt.format(entry.number)+(entry.total>1?' ('+fmt.format(entry.part)+' از '+fmt.format(entry.total)+')':'');
   lines.push(number+' — '+entry.clue+' — پاسخ: '+entry.answer);
  }
  lines.push('');
 }
 return lines.join('\n').trim();
}
function render(container,item,player=root?.PayamePlayer){
 if(!container)throw Error('محل نمایش فرهنگ پاسخ‌ها مشخص نیست.');
 const grouped=entries(item,player),all=[...grouped.horizontal,...grouped.vertical];
 const doc=container.ownerDocument||document;
 const el=(tag,className,value)=>{
  const node=doc.createElement(tag);if(className)node.className=className;
  if(value!==undefined)node.textContent=value;return node;
 };
 container.replaceChildren();
 const details=el('details','dictionary-details');
 const summary=el('summary','dictionary-summary');
 const summaryTitle=el('span','','فرهنگ سؤال‌ها و جواب‌های این جدول');
 const summaryCount=el('span','dictionary-count',fmt.format(all.length)+' مدخل • شامل پاسخنامه');
 summary.append(summaryTitle,summaryCount);
 const inner=el('div','dictionary-inner');
 const intro=el('p','muted small','پاسخنامهٔ متنیِ جدول منتشرشده، با ترتیب افقی از راست به چپ و عمودی از بالا به پایین. بازکردن این بخش پاسخ‌ها را آشکار می‌کند و به خانه‌های بازی دست نمی‌زند.');
 inner.append(intro);
 const toolbar=el('div','dictionary-toolbar');
 const copy=el('button','action-button secondary','کپی همهٔ سؤال‌ها و جواب‌ها');
 copy.type='button';
 const msg=el('span','dictionary-message','');
 msg.setAttribute('role','status');
 copy.addEventListener('click',async()=>{
  try{
   await navigator.clipboard.writeText(asText(grouped,item));
   msg.textContent='متن کامل فرهنگ کپی شد.';
  }catch(_){
   msg.textContent='کپی خودکار در این مرورگر در دسترس نیست؛ می‌توانی متن را انتخاب و کپی کنی.';
  }
 });
 toolbar.append(copy,msg);inner.append(toolbar);
 const columns=el('div','dictionary-columns');
 for(const [dir,label] of [['horizontal','افقی'],['vertical','عمودی']]){
  const section=el('section','dictionary-column');
  section.append(el('h3','dictionary-heading',label+' — '+fmt.format(grouped[dir].length)+' پاسخ'));
  const list=el('ol','dictionary-list');
  for(const e of grouped[dir]){
   const li=el('li','dictionary-item');
   const heading=el('div','dictionary-question');
   heading.append(el('span','dictionary-number',
    fmt.format(e.number)+(e.total>1?' • '+fmt.format(e.part):'')));
   heading.append(el('span','dictionary-clue',e.clue));
   const answer=el('div','dictionary-answer');
   answer.append(el('span','dictionary-answer-label','پاسخ:'));
   answer.append(el('strong','dictionary-answer-word',e.answer));
   answer.append(el('span','dictionary-answer-length','('+fmt.format(e.length)+' حرف)'));
   li.append(heading,answer);list.append(li);
  }
  section.append(list);columns.append(section);
 }
 inner.append(columns);details.append(summary,inner);container.append(details);
 return {count:all.length,grouped};
}
const api={entries,asText,render};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.PayameGlossary=api;
})(typeof window!=='undefined'?window:null);
