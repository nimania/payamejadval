/* Verified Sudoku puzzle generator and validator.
   Every public puzzle must have one and only one solution.
   Generator is deterministic per Tehran calendar date and difficulty. */
(function(root){
'use strict';
const R=[0,1,2,3,4,5,6,7,8];
const levels={easy:{target:43,min:39,max:50},medium:{target:32,min:30,max:38},hard:{target:29,min:25,max:33}};
function rand(seed){let state=seed>>>0;return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);}
function shuffle(items,rng){const a=items.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function pattern(r,c){return (r*3+Math.floor(r/3)+c)%9;}
function solutionFor(seed){
 const rng=rand(seed),bands=shuffle([0,1,2],rng),stacks=shuffle([0,1,2],rng);
 const rows=bands.flatMap(b=>shuffle(R.slice(0,3),rng).map(x=>b*3+x));
 const cols=stacks.flatMap(b=>shuffle(R.slice(0,3),rng).map(x=>b*3+x));
 const digits=shuffle('123456789'.split(''),rng);
 const transpose=rng()<.5;
 return R.flatMap(r=>R.map(c=>digits[pattern(transpose?cols[c]:rows[r],transpose?rows[r]:cols[c])])).join('');
}
function candidates(grid,index){
 const r=Math.floor(index/9),c=index%9,used=new Set();
 for(let i=0;i<9;i++){
  used.add(grid[r*9+i]);used.add(grid[i*9+c]);
  used.add(grid[(Math.floor(r/3)*3+Math.floor(i/3))*9+Math.floor(c/3)*3+i%3]);
 }
 return '123456789'.split('').filter(d=>!used.has(d));
}
function countSolutions(grid,limit=2){
 if(typeof grid!=='string'||!/^[0-9]{81}$/.test(grid))return 0;
 const data=grid.split('');
 let found=0;
 function visit(){
  if(found>=limit)return;
  let best=-1,options=null;
  for(let i=0;i<81;i++){
   if(data[i]!=='0')continue;
   const choices=candidates(data,i);
   if(!choices.length)return;
   if(!options||choices.length<options.length){best=i;options=choices;if(choices.length===1)break;}
  }
  if(best<0){found++;return;}
  for(const d of options){
   data[best]=d;visit();if(found>=limit)break;
  }
  data[best]='0';
 }
 // Prevent an already-invalid fixed grid from being counted as a solution.
 for(let i=0;i<81;i++){
  if(data[i]==='0')continue;
  const d=data[i];data[i]='0';
  if(!candidates(data,i).includes(d))return 0;
  data[i]=d;
 }
 visit();return found;
}
function isSolved(grid){
 if(typeof grid!=='string'||!/^[1-9]{81}$/.test(grid))return false;
 const groups=[];
 for(let r=0;r<9;r++)groups.push(R.map(c=>grid[r*9+c]));
 for(let c=0;c<9;c++)groups.push(R.map(r=>grid[r*9+c]));
 for(let br=0;br<3;br++)for(let bc=0;bc<3;bc++)
  groups.push(R.flatMap(k=>grid[(br*3+Math.floor(k/3))*9+bc*3+k%3]));
 return groups.every(g=>new Set(g).size===9);
}
function singlesRemaining(start){
 const data=start.split('');let progress=true;
 while(progress){
  progress=false;
  for(let i=0;i<81;i++)if(data[i]==='0'){
   const a=candidates(data,i);if(!a.length)return 81;
   if(a.length===1){data[i]=a[0];progress=true;}
  }
  if(progress)continue;
  const groups=[];
  for(let r=0;r<9;r++)groups.push(R.map(c=>r*9+c));
  for(let c=0;c<9;c++)groups.push(R.map(r=>r*9+c));
  for(let br=0;br<3;br++)for(let bc=0;bc<3;bc++)
   groups.push(R.map(k=>(br*3+Math.floor(k/3))*9+bc*3+k%3));
  outer:for(const cells of groups)for(const digit of '123456789'){
   const spots=cells.filter(i=>data[i]==='0'&&candidates(data,i).includes(digit));
   if(spots.length===1){data[spots[0]]=digit;progress=true;break outer;}
  }
 }
 return data.filter(v=>v==='0').length;
}
function validate(item){
 const p=item?.puzzle;
 if(item?.type!=='sudoku'||p?.version!==1||!levels[p.difficulty]||
    typeof item.id!=='string'||!item.id||typeof item.title!=='string')return false;
 if(typeof p.givens!=='string'||!/^([0-9]{81})$/.test(p.givens)||!isSolved(p.solution))return false;
 if([...p.givens].some((v,i)=>v!=='0'&&v!==p.solution[i]))return false;
 const clues=p.givens.replace(/0/g,'').length;
 if(clues<levels[p.difficulty].min||clues>levels[p.difficulty].max)return false;
 if(countSolutions(p.givens,2)!==1)return false;
 return true;
}
function create(date,difficulty,salt=0){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!levels[difficulty])throw Error('Invalid date or Sudoku level');
 const numeric=Number(date.replace(/-/g,'')),step={easy:0,medium:1,hard:2}[difficulty],level=levels[difficulty];
 let winner=null;
 for(let attempt=0;attempt<45;attempt++){
  const seed=((numeric*37+step*2000003+salt+attempt*7919)>>>0);
  const solved=solutionFor(seed),rng=rand(seed^0x9e3779b9),cells=shuffle(R.flatMap(r=>R.map(c=>r*9+c)),rng);
  const data=solved.split('');let remaining=81;
  for(const i of cells){
   if(remaining<=level.target)break;
   const old=data[i];data[i]='0';
   if(countSolutions(data.join(''),2)!==1)data[i]=old;
   else remaining--;
  }
  const puzzle=data.join('');
  if(remaining>level.max)continue;
  const unsolved=singlesRemaining(puzzle);
  const score=level.target-Math.abs(level.target-remaining)*3+
   (difficulty==='easy'? -unsolved*2 : difficulty==='hard'?Math.min(unsolved,20):
    (unsolved>=1&&unsolved<=18?16-Math.abs(unsolved-8):unsolved===0?-20:-10));
  if(!winner||score>winner.score)winner={puzzle,solved,remaining,unsolved,score};
  if(difficulty==='easy'&&unsolved===0&&remaining<=level.target)break;
  if(difficulty==='hard'&&unsolved>=6&&remaining<=level.target+1)break;
  if(difficulty==='medium'&&remaining<=level.target&&unsolved>=1&&unsolved<=18)break;
 }
 if(!winner)throw Error('No uniquely solvable Sudoku produced at requested difficulty');
 return {id:'sudoku-'+date+'-'+difficulty,type:'sudoku',
 title:'سودوکو '+({easy:'آسان',medium:'متوسط',hard:'سخت'}[difficulty])+' ـ '+date,
 publishedAt:date+'T08:00:00+03:30',
 puzzle:{version:1,difficulty,givens:winner.puzzle,solution:winner.solved,
  quality:{unique:true,givens:winner.remaining,singlesUnsolved:winner.unsolved,method:'unique-solution-generator-v1'}}};
}
const api={levels,solutionFor,countSolutions,isSolved,singlesRemaining,create,validate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.PayameSudoku=api;
})(typeof window!=='undefined'?window:null);
