/* Instagram-ready Persian 5x5 mini crossword image export.
   Renders only the published puzzle, never browser progress or private lexicon.
   PNG: 1080x1350, suitable for a 4:5 Instagram carousel. */
(function(root){
'use strict';
const W=1080,H=1350;
const font='Vazirmatn, Tahoma, Arial, sans-serif';
const format=new Intl.NumberFormat('fa-IR');
const ink='#222322',paper='#f8f7f3',ruby='#75272d';
const logoPath='./assets/payamejadval-logo.webp';
function assertMini(item,player){
 if(item?.type!=='mini'||item?.puzzle?.grid?.length!==5||!player?.validateItem(item))
  throw Error('فقط جدول مینی ۵×۵ معتبر را می‌توان به عکس تبدیل کرد.');
}
function label(item,mode){
 const match=String(item.title||'').match(/شماره(?:ٔ|ی|ه)?\s*([۰-۹٠-٩0-9]+)/);
 const number=match?match[1]:'';
 return (mode==='answers'?'پاسخنامهٔ مینی':'جدول مینی ۵×۵')+(number?' ـ شمارهٔ '+number:'');
}
function setFont(ctx,size,bold=false){
 ctx.font=(bold?'700 ':'400 ')+size+'px '+font;
 ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='middle';
}
function write(ctx,value,x,y,size=24,bold=false,color=ink,align='right'){
 setFont(ctx,size,bold);ctx.fillStyle=color;ctx.textAlign=align;
 ctx.fillText(String(value),x,y);
}
function width(ctx,value,size,bold=false){setFont(ctx,size,bold);return ctx.measureText(String(value)).width;}
function breakWord(ctx,word,maxWidth,size){
 const parts=[];let current='';
 for(const ch of [...word]){
  if(current&&width(ctx,current+ch,size)>maxWidth){parts.push(current);current=ch;}
  else current+=ch;
 }
 if(current)parts.push(current);
 return parts;
}
function wrap(ctx,source,maxWidth,size){
 const words=String(source).trim().split(/\s+/);
 const out=[];let line='';
 for(let word of words){
  if(!word)continue;
  if(width(ctx,word,size)>maxWidth){
   if(line){out.push(line);line='';}
   const pieces=breakWord(ctx,word,maxWidth,size);
   out.push(...pieces.slice(0,-1));
   word=pieces[pieces.length-1]||'';
  }
  const candidate=line?line+' '+word:word;
  if(line&&width(ctx,candidate,size)>maxWidth){out.push(line);line=word;}
  else line=candidate;
 }
 if(line)out.push(line);
 return out.length?out:[''];
}
function clueGroups(item){
 return ['horizontal','vertical'].map(dir=>
  Object.entries(item.puzzle.clues[dir]).sort((a,b)=>Number(a[0])-Number(b[0]))
   .flatMap(([number,clues])=>clues.map(clue=>({number:format.format(Number(number)),clue}))));
}
function plan(ctx,item){
 const [across,down]=clueGroups(item);
 const columns=[{left:82,right:502,entries:down,title:'عمودی'},
  {left:577,right:998,entries:across,title:'افقی'}];
 // The same exact ten clues must fit in every exported image.
 for(const boardSize of [490,465,440,415]){
  const boardTop=359,barTop=boardTop+boardSize+27,bodyTop=barTop+67;
  for(const size of [24,23,22,21,20,19,18]){
   const lineHeight=Math.ceil(size*1.35),gap=9;
   const layout=columns.map(col=>{
    const entries=col.entries.map(row=>({
     number:row.number,
     lines:wrap(ctx,row.clue,col.right-col.left-48,size)
    }));
    const height=entries.reduce((sum,row)=>sum+row.lines.length*lineHeight+gap,0);
    return {...col,entries,height};
   });
   if(layout.every(col=>bodyTop+col.height<=1214))
    return {boardSize,boardTop,barTop,bodyTop,size,lineHeight,gap,columns:layout};
  }
 }
 throw Error('سؤال‌های این جدول برای تصویر خوانای ۱۰۸۰×۱۳۵۰ بیش از حد طولانی‌اند؛ برخی سؤال‌ها باید کوتاه‌تر شوند.');
}
function drawFrame(ctx){
 ctx.fillStyle=paper;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#2f302f';ctx.lineWidth=3;ctx.strokeRect(24,23,W-48,H-46);
 ctx.strokeStyle='#a5a49c';ctx.lineWidth=1;ctx.strokeRect(34,33,W-68,H-66);
 ctx.strokeStyle='#313131';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(65,133);ctx.lineTo(1015,133);ctx.stroke();
}
function drawHeader(ctx,item,mode,logo){
 write(ctx,'@jadvalfarsi',76,83,24,true,ink,'left');
 if(logo&&typeof ctx.drawImage==='function'){
  const iw=logo.naturalWidth||logo.width||250,ih=logo.naturalHeight||logo.height||80;
  const scale=Math.min(205/iw,80/ih);
  ctx.drawImage(logo,997-iw*scale,42,iw*scale,ih*scale);
  write(ctx,'روزنامهٔ بازی و واژه',786,81,21,false,ink);
 }else{
  write(ctx,'پیام جدول',999,82,30,true,ruby);
  write(ctx,'روزنامهٔ بازی و واژه',760,82,22,false,ink);
 }
 write(ctx,'جدول فارسی',W/2,205,76,true,ink,'center');
 ctx.fillStyle=ruby;ctx.fillRect(236,273,608,5);
 write(ctx,label(item,mode),W/2,309,30,true,ruby,'center');
 write(ctx,'افقی: راست به چپ  •  عمودی: بالا به پایین',W/2,342,19,false,'#4b4945','center');
}
function drawGrid(ctx,item,mode,layout){
 const n=5,cell=layout.boardSize/5,left=(W-layout.boardSize)/2,
  top=layout.boardTop,right=left+layout.boardSize,grid=item.puzzle.grid;
 // Explicit row and column indexes: avoids collisions in first-row corner.
 for(let c=0;c<n;c++){
  const x=left+(c+.5)*cell;
  write(ctx,format.format(n-c),x,top-17,18,true,ruby,'center');
 }
 for(let r=0;r<n;r++){
  write(ctx,format.format(r+1),right+24,top+(r+.5)*cell,18,true,ruby,'center');
  for(let c=0;c<n;c++){
   const x=left+c*cell,y=top+r*cell,v=grid[r][c];
   ctx.fillStyle=v?'#ffffff':'#242424';ctx.fillRect(x,y,cell,cell);
   ctx.strokeStyle='#2a2927';ctx.lineWidth=2.2;ctx.strokeRect(x,y,cell,cell);
   if(mode==='answers'&&v)
    write(ctx,v,x+cell/2,y+cell/2+2,Math.floor(cell*.65),true,ink,'center');
  }
 }
 ctx.strokeStyle='#252423';ctx.lineWidth=6;ctx.strokeRect(left,top,layout.boardSize,layout.boardSize);
}
function drawClues(ctx,layout){
 const barTop=layout.barTop;
 ctx.strokeStyle='#bab8b1';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(64,barTop-13);ctx.lineTo(1016,barTop-13);ctx.stroke();
 ctx.beginPath();ctx.moveTo(540,barTop+3);ctx.lineTo(540,1207);ctx.stroke();
 for(const col of layout.columns){
  ctx.fillStyle='#282828';ctx.fillRect(col.left,barTop,col.right-col.left,48);
  write(ctx,col.title,(col.left+col.right)/2,barTop+24,28,true,'#ffffff','center');
  let y=layout.bodyTop;
  for(const entry of col.entries){
   const num=entry.number+' ـ';
   write(ctx,num,col.right-4,y+layout.lineHeight/2,layout.size,true,ruby);
   for(let i=0;i<entry.lines.length;i++)
    write(ctx,entry.lines[i],col.right-45,y+(i+.5)*layout.lineHeight,
     layout.size,false,ink);
   y+=entry.lines.length*layout.lineHeight+layout.gap;
  }
 }
}
function drawFooter(ctx,item,mode){
 const count=clueGroups(item).reduce((sum,col)=>sum+col.length,0);
 ctx.fillStyle='#252525';ctx.fillRect(64,1220,952,66);
 write(ctx,mode==='answers'?'چند پاسخ را درست حدس زده بودی؟':'چند پاسخ را درست حدس می‌زنی؟',
  W/2,1253,31,true,'#ffffff','center');
 write(ctx,mode==='answers'?'نتیجه‌ات را در کامنت‌ها بنویس':
  'از ۰ تا '+format.format(count)+'، فقط عددش را کامنت کن',W/2,1305,21,true,ruby,'center');
}
function renderCanvas(ctx,item,mode,logo,player=root?.PayamePlayer){
 if(mode!=='blank'&&mode!=='answers')throw Error('نسخهٔ تصویر ناشناخته است.');
 assertMini(item,player);
 const layout=plan(ctx,item);
 drawFrame(ctx);drawHeader(ctx,item,mode,logo);
 drawGrid(ctx,item,mode,layout);drawClues(ctx,layout);drawFooter(ctx,item,mode);
 return {width:W,height:H,layout,clues:clueGroups(item).reduce((sum,g)=>sum+g.length,0)};
}
async function loadLogo(){
 if(!root||typeof root.Image!=='function')return null;
 return new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>resolve(null);
  img.src=logoPath;
 });
}
function filename(item,mode){
 const id=String(item.id||'mini').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,90)||'mini';
 return 'payamejadval-'+id+(mode==='answers'?'-answers':'-blank')+'-instagram-1080x1350.png';
}
async function download(item,mode,player=root?.PayamePlayer){
 assertMini(item,player);
 if(!root?.document)throw Error('دانلود تصویر فقط در مرورگر امکان‌پذیر است.');
 try{await root.document.fonts?.load('700 24px Vazirmatn');
  await root.document.fonts?.load('400 21px Vazirmatn');}catch(_){}
 const canvas=root.document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('مرورگر از Canvas پشتیبانی نمی‌کند.');
 const logo=await loadLogo();
 renderCanvas(ctx,item,mode,logo,player);
 const blob=await new Promise((resolve,reject)=>{
  canvas.toBlob(b=>b?resolve(b):reject(Error('ساخت PNG ناموفق بود.')),'image/png');
 });
 const url=URL.createObjectURL(blob),link=root.document.createElement('a');
 link.href=url;link.download=filename(item,mode);
 root.document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 return {filename:filename(item,mode),width:W,height:H,bytes:blob.size};
}
function render(container,item,player=root?.PayamePlayer){
 assertMini(item,player);
 const doc=container.ownerDocument||document;
 const title=doc.createElement('h2');title.textContent='دانلود عکس مخصوص پست اینستاگرام';
 const description=doc.createElement('p');description.className='muted small';
 description.textContent='دو عکس PNG عمودی ۴:۵، ابعاد ۱۰۸۰×۱۳۵۰؛ یکی جدول خالی و دیگری پاسخنامه، با لوگو، سؤال‌های افقی و عمودی و قالب سیاه‌وسفید.';
 const actions=doc.createElement('div');actions.className='print-download-actions';
 const status=doc.createElement('p');status.className='muted small';status.setAttribute('role','status');
 for(const [mode,name] of [['blank','دانلود عکس جدول'],['answers','دانلود عکس پاسخنامه']]){
  const button=doc.createElement('button');button.type='button';
  button.className='action-button'+(mode==='answers'?' secondary':'');
  button.textContent=name;
  button.addEventListener('click',async()=>{
   button.disabled=true;status.textContent='در حال ساخت تصویر اینستاگرام…';
   try{
    const result=await download(item,mode,player);
    status.textContent='تصویر '+format.format(result.width)+'×'+format.format(result.height)+' آماده شد.';
   }catch(err){status.textContent='ساخت عکس ناموفق بود: '+err.message;}
   finally{button.disabled=false;}
  });
  actions.append(button);
 }
 container.append(title,description,actions,status);
}
const api={width:W,height:H,clueGroups,wrap,plan,renderCanvas,filename,download,render};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.PayameMiniImage=api;
})(typeof window!=='undefined'?window:null);
