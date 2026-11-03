/* Self-contained printable A4 PDF export for approved crossword puzzles.
   Persian glyph shaping is performed by the browser's Canvas 2D engine,
   then each page is embedded as a high-resolution JPEG in a standards-
   compliant PDF document. No external PDF/font services or private bank. */
(function(root){
'use strict';
const WIDTH=1240,HEIGHT=1754,EDGE=80,AREA=WIDTH-2*EDGE;
const fmt=new Intl.NumberFormat('fa-IR');
const font='Tahoma, Arial, sans-serif';
function validate(item,player=root?.PayamePlayer){
 if(!player?.validateItem?.(item))throw new Error('اطلاعات جدول منتشرشده معتبر نیست.');
 return player;
}
function groups(item,player){
 validate(item,player);
 const out={horizontal:[],vertical:[]},slots=player.slotsFor(item.puzzle.grid);
 const visited=new Map();
 for(const slot of slots){
  const id=slot.dir+':'+slot.group,idx=visited.get(id)||0;
  const clue=item.puzzle.clues[slot.dir]?.[String(slot.group)]?.[idx];
  if(!clue||typeof clue!=='string')throw new Error('تطبیق پاسخ‌ها و سؤال‌ها ناقص است.');
  out[slot.dir].push({number:slot.group,part:idx+1,clue,answer:slot.answer});
  visited.set(id,idx+1);
 }
 return out;
}
function canvasPage(){
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('مرورگر امکان ساخت تصویر PDF را ندارد.');
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='middle';
 return {canvas,ctx};
}
function text(ctx,value,x,y,size=24,bold=false,color='#202a33'){
 ctx.fillStyle=color;ctx.font=(bold?'bold ':'')+size+'px '+font;
 ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='middle';
 ctx.fillText(String(value),x,y);
}
function lines(ctx,value,maxWidth,size=24,bold=false){
 ctx.font=(bold?'bold ':'')+size+'px '+font;
 const parts=String(value).trim().split(/\s+/),out=[];
 let current='';
 for(const word of parts){
  const next=current?current+' '+word:word;
  if(current&&ctx.measureText(next).width>maxWidth){out.push(current);current=word;}
  else current=next;
 }
 if(current)out.push(current);
 return out.length?out:[''];
}
function header(ctx,item,mode,page){
 text(ctx,'پیام جدول  |  جدول کلمات متقاطع',WIDTH-EDGE,75,24,true,'#405668');
 ctx.strokeStyle='#dae1e5';ctx.lineWidth=2;ctx.beginPath();
 ctx.moveTo(EDGE,104);ctx.lineTo(WIDTH-EDGE,104);ctx.stroke();
 text(ctx,item.title,WIDTH-EDGE,157,42,true);
 text(ctx,mode==='answers'?'پاسخنامهٔ کامل':'نسخهٔ قابل چاپ برای حل روی کاغذ',WIDTH-EDGE,208,26,false,'#526571');
 text(ctx,'صفحهٔ '+fmt.format(page),WIDTH-EDGE,HEIGHT-52,19,false,'#74828c');
 text(ctx,'payamejadval',EDGE+210,HEIGHT-52,18,false,'#74828c');
}
function board(ctx,item,showAnswers,top){
 const grid=item.puzzle.grid,n=grid.length;
 const available=AREA-60,cell=Math.floor(available/n),boardWidth=cell*n;
 const left=Math.round((WIDTH-boardWidth)/2)-18,right=left+boardWidth;
 const topAxis=top-38;
 for(let c=0;c<n;c++)text(ctx,fmt.format(c+1),right-c*cell-cell/2+12,topAxis,21,true,'#344c5c');
 for(let r=0;r<n;r++){
  text(ctx,fmt.format(r+1),right+43,top+r*cell+cell/2,21,true,'#344c5c');
  for(let c=0;c<n;c++){
   const x=right-(c+1)*cell,y=top+r*cell;
   const ch=grid[r][n-1-c];
   ctx.fillStyle=ch?'#fff':'#272727';ctx.fillRect(x,y,cell,cell);
   ctx.strokeStyle='#8998a3';ctx.lineWidth=1.2;ctx.strokeRect(x,y,cell,cell);
   if(showAnswers&&ch)text(ctx,ch,x+cell/2+16,y+cell/2,Math.min(33,Math.round(cell*.57)),true,'#131b20');
  }
 }
 return top+n*cell;
}
function addGroupPages(item,mode,groupsByDir,pages,pageNumber){
 const source=[['horizontal','افقی'],['vertical','عمودی']];
 let pg=canvasPage(),ctx=pg.ctx,y=0;
 function newPage(){
  if(y)pages.push(pg.canvas);
  pg=canvasPage();ctx=pg.ctx;
  header(ctx,item,mode,++pageNumber);
  y=275;
 }
 newPage();
 for(const [dir,label] of source){
  if(y+115>HEIGHT-150)newPage();
  text(ctx,label,WIDTH-EDGE,y,31,true);y+=54;
  for(const group of groupsByDir[dir]){
   const number=fmt.format(group.number)+(group.part>1?' ('+fmt.format(group.part)+')':'');
   const body=group.clue+(mode==='answers'?'  —  '+group.answer:'');
   const wrapped=lines(ctx,body,AREA-95,23);
   if(y+wrapped.length*41+25>HEIGHT-155)newPage();
   text(ctx,number+' ـ',WIDTH-EDGE,y+15,22,true,'#344f62');
   for(let i=0;i<wrapped.length;i++){
    text(ctx,wrapped[i],WIDTH-EDGE-95,y+15+i*41,23,mode==='answers'&&i===wrapped.length-1);
   }
   y+=wrapped.length*41+20;
  }
  y+=36;
 }
 if(y)pages.push(pg.canvas);
}
function createPages(item,mode,player){
 const grouped=groups(item,player),pages=[];
 const page=canvasPage();header(page.ctx,item,mode,1);
 const bottom=board(page.ctx,item,mode==='answers',278);
 text(page.ctx,mode==='answers'?'پاسخ کامل جدول':'پاسخ‌ها در این نسخه چاپ نشده‌اند.',WIDTH-EDGE,bottom+50,24,false,'#536b77');
 text(page.ctx,'افقی: راست به چپ   |   عمودی: بالا به پایین',WIDTH-EDGE,bottom+92,22,false,'#647883');
 pages.push(page.canvas);
 addGroupPages(item,mode,grouped,pages,1);
 return pages;
}
function encodePDF(canvases){
 const encoder=new TextEncoder(),segments=[],objects=[],offsets=[0];
 let length=0;
 function pushBytes(b){segments.push(b);length+=b.length;}
 function pushString(s){pushBytes(encoder.encode(s));}
 function object(id,body){
  offsets[id]=length;
  pushString(id+' 0 obj\n'+body+'\nendobj\n');
 }
 const images=canvases.map(canvas=>{
  const uri=canvas.toDataURL('image/jpeg',.86);
  if(!uri.startsWith('data:image/jpeg;base64,'))throw new Error('مرورگر از خروجی JPEG برای PDF پشتیبانی نمی‌کند.');
  const binary=atob(uri.split(',')[1]);
  const b=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)b[i]=binary.charCodeAt(i);
  return b;
 });
 const count=canvases.length,firstPage=3,pageRefs=[];
 pushString('%PDF-1.4\n%\xD3\xF4\xCC\xE1\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 for(let i=0;i<count;i++)pageRefs.push((firstPage+3*i)+' 0 R');
 object(2,'<< /Type /Pages /Kids ['+pageRefs.join(' ')+'] /Count '+count+' >>');
 for(let i=0;i<count;i++){
  const p=firstPage+3*i,im=p+1,contents=p+2,img=images[i];
  object(p,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89]'+
   ' /Resources << /XObject << /Im0 '+im+' 0 R >> >> /Contents '+contents+' 0 R >>');
  offsets[im]=length;
  pushString(im+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+WIDTH+' /Height '+HEIGHT+
   ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+img.length+' >>\nstream\n');
  pushBytes(img);pushString('\nendstream\nendobj\n');
  const cmd=encoder.encode('q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n');
  offsets[contents]=length;
  pushString(contents+' 0 obj\n<< /Length '+cmd.length+' >>\nstream\n');
  pushBytes(cmd);pushString('endstream\nendobj\n');
 }
 const start=length;
 pushString('xref\n0 '+(3+3*count)+'\n0000000000 65535 f \n');
 for(let i=1;i<3+3*count;i++)pushString(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 pushString('trailer\n<< /Size '+(3+3*count)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
 const output=new Uint8Array(length);let cursor=0;
 for(const bytes of segments){output.set(bytes,cursor);cursor+=bytes.length;}
 return output;
}
function filename(item,mode){
 const id=String(item.id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,90)||'crossword';
 return 'payamejadval-'+id+(mode==='answers'?'-answers':'-blank')+'.pdf';
}
async function download(item,mode,player=root?.PayamePlayer){
 if(!['blank','answers'].includes(mode))throw new Error('نوع فایل چاپی ناشناخته است.');
 validate(item,player);
 const bytes=encodePDF(createPages(item,mode,player));
 const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=filename(item,mode);
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 return {filename:filename(item,mode),pages:bytes.length};
}
function render(container,item,player=root?.PayamePlayer){
 validate(item,player);container.replaceChildren();
 const doc=container.ownerDocument||document;
 const heading=doc.createElement('h2');heading.textContent='دانلود و چاپ جدول کلمات متقاطع';
 const desc=doc.createElement('p');desc.className='muted small';
 desc.textContent='دو فایل PDF در اندازهٔ A4: یکی بدون پاسخ برای حل روی کاغذ و دیگری پاسخنامهٔ کامل. هر فایل شامل شبکه و سؤال‌های افقی و عمودی است.';
 const bar=doc.createElement('div');bar.className='print-download-actions';
 const status=doc.createElement('p');status.className='muted small';status.setAttribute('role','status');
 for(const [mode,label] of [['blank','دانلود PDF جدول بدون جواب'],['answers','دانلود PDF پاسخنامه']]){
  const button=doc.createElement('button');button.type='button';button.className='action-button'+(mode==='answers'?' secondary':'');
  button.textContent=label;
  button.addEventListener('click',async()=>{
   button.disabled=true;status.textContent='در حال آماده‌سازی PDF برای چاپ…';
   try{await download(item,mode,player);status.textContent='فایل PDF آماده شد. برای چاپ، فایل را باز کن و اندازهٔ A4 را انتخاب کن.';}
   catch(e){status.textContent='ساخت فایل ناموفق بود: '+e.message;}
   finally{button.disabled=false;}
  });
  bar.append(button);
 }
 container.append(heading,desc,bar,status);
}
const api={groups,validate,encodePDF,createPages,download,render,filename};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.PayamePrintPDF=api;
})(typeof window!=='undefined'?window:null);
