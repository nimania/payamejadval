/* Editorial data contract for Persian clue-in-cell (Swedish) crosswords.
   No automatic publishing until a fully checked source grid exists.
   Horizontal = 30 columns x 20 rows; vertical = 20 columns x 14 rows. */
(function(root){
'use strict';
const sizes=Object.freeze({
 horizontal:{width:30,height:20,label:'شرح در متن افقی ۳۰×۲۰'},
 vertical:{width:20,height:14,label:'شرح در متن عمودی ۲۰×۱۴'}
});
const normalize=s=>String(s||'').replace(/[يى]/g,'ی').replace(/ك/g,'ک')
 .replace(/[\u064b-\u065f\u0670\s\u200c\u200d\-ـ]/g,'');
function validate(item){
 const variant=item?.variant,dim=sizes[variant],p=item?.puzzle;
 if(item?.type!=='clue-in-cell'||!dim||p?.version!==1)return false;
 if(!Array.isArray(p.grid)||p.grid.length!==dim.height||!p.grid.every(row=>Array.isArray(row)&&row.length===dim.width))
  return false;
 if(!Array.isArray(p.entries)||!p.entries.length)return false;
 const isInside=([r,c])=>Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<dim.height&&c>=0&&c<dim.width;
 const used=new Map(),clueRefs=new Map(),ids=new Set(),pairs=new Set();
 for(let r=0;r<dim.height;r++)for(let c=0;c<dim.width;c++){
  const cell=p.grid[r][c];
  if(!cell||!['letter','clue','block'].includes(cell.kind))return false;
  if(cell.kind==='letter'&&(!/^[آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیؤئء]$/.test(cell.answer)||cell.answer!==normalize(cell.answer)))return false;
  if(cell.kind!=='letter'&&'answer'in cell)return false;
 }
 for(const entry of p.entries){
  if(typeof entry.id!=='string'||ids.has(entry.id)||!entry.id||
    typeof entry.clue!=='string'||!entry.clue.trim()||
    typeof entry.answer!=='string'||!entry.answer||!['across','down'].includes(entry.direction)||
    !Array.isArray(entry.start)||entry.start.length!==2||!isInside(entry.start)||
    !Array.isArray(entry.clueCell)||entry.clueCell.length!==2||!isInside(entry.clueCell))return false;
  const answer=normalize(entry.answer);
  if(!answer||answer!==entry.answer||ids.has(entry.id))return false;
  const key=answer+'\u0000'+entry.clue.trim();
  if(pairs.has(key))return false;
  ids.add(entry.id);pairs.add(key);
  const [r,c]=entry.start,[cr,cc]=entry.clueCell;
  if(entry.direction==='across'?(cr!==r||cc!==c+1):(cr!==r-1||cc!==c))return false;
  if(p.grid[cr][cc].kind!=='clue')return false;
  const ref=cr+','+cc;clueRefs.set(ref,(clueRefs.get(ref)||0)+1);
  for(let i=0;i<[...answer].length;i++){
   const rr=entry.direction==='across'?r:r+i;
   const col=entry.direction==='across'?c-i:c;
   if(!isInside([rr,col])||p.grid[rr][col].kind!=='letter'||p.grid[rr][col].answer!==answer[i])return false;
   const slot=rr+','+col,prev=used.get(slot)||new Set();
   if(prev.has(entry.direction))return false;
   prev.add(entry.direction);used.set(slot,prev);
  }
 }
 for(let r=0;r<dim.height;r++)for(let c=0;c<dim.width;c++){
  const cell=p.grid[r][c],coord=r+','+c;
  if(cell.kind==='letter'&&!used.has(coord))return false;
  if(cell.kind==='clue'&&!clueRefs.has(coord))return false;
 }
 return true;
}
const api={sizes,normalize,validate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.PayameClueInCell=api;
})(typeof window!=='undefined'?window:null);
