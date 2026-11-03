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
/* Newspaper / magazine layout for a single 15x15 crossword.
   Other sizes retain their previously established print layout.
   Geometry is in A4 raster coordinates, 1240 x 1754 px (approx. 150 dpi). */
function newspaperHeader(ctx,item,mode,page,logo,continuation=false){
 const ink='#222222',muted='#555555';
 // A real brand image, shipped on the same origin as this script.
 if(logo&&typeof ctx.drawImage==='function'){
  const scale=Math.min(310/(logo.naturalWidth||logo.width||310),112/(logo.naturalHeight||logo.height||112));
  const w=(logo.naturalWidth||logo.width||310)*scale,h=(logo.naturalHeight||logo.height||112)*scale;
  ctx.drawImage(logo,WIDTH-EDGE-w,38,w,h);
 }else{
  text(ctx,'پیام جدول',WIDTH-EDGE,85,39,true,ink);
 }
 text(ctx,'جدول کلمات متقاطع',810,74,40,true,ink);
 text(ctx,item.title,810,128,25,true,ink);
 text(ctx,mode==='answers'?'پاسخنامهٔ جدول':'نسخهٔ روزنامه‌ای برای حل روی کاغذ',810,164,20,false,muted);
 ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();
 ctx.moveTo(EDGE,198);ctx.lineTo(WIDTH-EDGE,198);ctx.stroke();
 if(continuation)text(ctx,'ادامهٔ سؤال‌ها',WIDTH-EDGE,236,22,true,ink);
 ctx.strokeStyle='#929292';ctx.lineWidth=1;ctx.beginPath();
 ctx.moveTo(EDGE,HEIGHT-78);ctx.lineTo(WIDTH-EDGE,HEIGHT-78);ctx.stroke();
 text(ctx,'پیام جدول • جدول کلمات متقاطع',WIDTH-EDGE,HEIGHT-52,18,false,muted);
 text(ctx,'صفحهٔ '+fmt.format(page),EDGE+155,HEIGHT-52,18,false,muted);
}

function newspaperBoard(ctx,item,mode,layout){
 const grid=item.puzzle.grid,n=grid.length,cell=layout.cell;
 const left=layout.boardLeft,top=layout.boardTop,right=left+cell*n;
 ctx.fillStyle='#343434';ctx.fillRect(left,top-62,cell*n,30);
 text(ctx,mode==='answers'?'حل جدول عادی':'جدول عادی',right-10,top-47,19,true,'#ffffff');
 for(let c=0;c<n;c++){
  ctx.fillStyle='#292929';ctx.font='bold 17px '+font;
  ctx.direction='rtl';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(fmt.format(c+1),right-(c+.5)*cell,top-19);
 }
 for(let r=0;r<n;r++){
  ctx.fillStyle='#292929';ctx.font='bold 17px '+font;
  ctx.direction='rtl';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(fmt.format(r+1),right+23,top+(r+.5)*cell);
  for(let c=0;c<n;c++){
   const x=right-(c+1)*cell,y=top+r*cell,ch=grid[r][n-1-c];
   ctx.fillStyle=ch?'#fff':'#171717';ctx.fillRect(x,y,cell,cell);
   ctx.strokeStyle='#777';ctx.lineWidth=1;ctx.strokeRect(x,y,cell,cell);
   if(mode==='answers'&&ch){
    ctx.fillStyle='#171717';ctx.font='bold '+Math.min(28,Math.floor(cell*.6))+'px '+font;
    ctx.direction='rtl';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(ch,x+cell/2,y+cell/2+1);
   }
  }
 }
 ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.strokeRect(left,top,cell*n,cell*n);
}
function compactNewspaperGroups(grouped,mode){
 const result=[];
 for(const [dir,label] of [['horizontal','افقی'],['vertical','عمودی']]){
  result.push({type:'section',label});
  const byNumber=new Map();
  for(const row of grouped[dir]){
   const a=byNumber.get(row.number)||[];
   a.push(mode==='answers'?row.clue+' : '+row.answer:row.clue);
   byNumber.set(row.number,a);
  }
  for(const [number,clues] of byNumber)
   result.push({type:'clue',text:fmt.format(number)+' - '+clues.join(' - ')});
 }
 return result;
}
function wrapNewspaper(ctx,source,maxWidth,fontSize){
 ctx.font=fontSize+'px '+font;
 const parts=String(source).trim().split(/\s+/);
 const result=[];
 let line='';
 function splitLongWord(word){
  let chunk='';
  for(const ch of word){
   if(chunk&&ctx.measureText(chunk+ch).width>maxWidth){
    result.push(chunk);chunk=ch;
   }else chunk+=ch;
  }
  return chunk;
 }
 for(let word of parts){
  if(!word)continue;
  if(ctx.measureText(word).width>maxWidth){
   if(line){result.push(line);line='';}
   word=splitLongWord(word);
  }
  const candidate=line?line+' '+word:word;
  if(line&&ctx.measureText(candidate).width>maxWidth){
   result.push(line);line=word;
  }else line=candidate;
 }
 if(line)result.push(line);
 return result.length?result:[''];
}
function newspaperGeometry(cell){
 const boardLeft=80,boardTop=278,boardRight=boardLeft+15*cell;
 const columnGap=20,topBelow=boardTop+15*cell+38;
 const belowWidth=Math.floor((boardRight-boardLeft-columnGap)/2);
 return {
  cell,boardLeft,boardTop,
  columns:[
   {left:boardRight+58,right:WIDTH-EDGE,top:245,bottom:HEIGHT-105},
   {left:boardLeft+belowWidth+columnGap,right:boardRight,top:topBelow,bottom:HEIGHT-105},
   {left:boardLeft,right:boardLeft+belowWidth,top:topBelow,bottom:HEIGHT-105}
  ]
 };
}
/* Plan the whole printable newspaper on a single sheet before drawing.
   Never silently create another page, discard a clue or draw beyond A4. */
function fitNewspaper(ctx,grouped,mode){
 const data=compactNewspaperGroups(grouped,mode);
 for(const fontSize of [20,19,18,17,16,15,14]){
  for(const cell of [44,42,40,38,36,34]){
   const geometry=newspaperGeometry(cell),lineHeight=Math.ceil(fontSize*1.32);
   const headingHeight=35,afterHeading=6,afterGroup=5;
   let colIndex=0,col=geometry.columns[0],y=col.top;
   const blocks=[],actualGroups=[];
   let fits=true;
   function advance(){
    colIndex++;
    if(colIndex>=geometry.columns.length){fits=false;return false;}
    col=geometry.columns[colIndex];y=col.top;return true;
   }
   for(let i=0;i<data.length;i++){
    const item=data[i];
    if(item.type==='section'){
     const first=data[i+1];
     const firstLines=first&&first.type==='clue'?wrapNewspaper(ctx,first.text,col.right-col.left-14,fontSize):[];
     const needed=headingHeight+afterHeading+firstLines.length*lineHeight+afterGroup;
     if(y+needed>col.bottom){
      if(!advance())break;
     }
     blocks.push({type:'section',column:colIndex,y,label:item.label});
     y+=headingHeight+afterHeading;
    }else{
     let wrapped=wrapNewspaper(ctx,item.text,col.right-col.left-14,fontSize);
     let h=wrapped.length*lineHeight+afterGroup;
     if(y+h>col.bottom){
      if(!advance())break;
      wrapped=wrapNewspaper(ctx,item.text,col.right-col.left-14,fontSize);
      h=wrapped.length*lineHeight+afterGroup;
     }
     if(y+h>col.bottom){fits=false;break;}
     blocks.push({type:'clue',column:colIndex,y,lines:wrapped,lineHeight});
     actualGroups.push(item.text);
     y+=h;
    }
   }
   if(fits&&actualGroups.length===data.filter(x=>x.type==='clue').length)
    return {...geometry,blocks,fontSize,headingHeight};
  }
 }
 throw Error('حجم سؤال‌ها برای چاپ خوانا در یک صفحهٔ A4 بیش از حد زیاد است. پرسش‌ها را کوتاه‌تر کن یا قالب چاپ را بزرگ‌تر انتخاب کن.');
}
function newspaperPages(item,mode,grouped,logo){
 const page=canvasPage(),ctx=page.ctx;
 const layout=fitNewspaper(ctx,grouped,mode);
 newspaperHeader(ctx,item,mode,1,logo);
 newspaperBoard(ctx,item,mode,layout);
 for(const block of layout.blocks){
  const col=layout.columns[block.column];
  if(block.type==='section'){
   ctx.fillStyle='#353535';
   ctx.fillRect(col.left,block.y,col.right-col.left,layout.headingHeight-4);
   text(ctx,block.label,col.right-9,block.y+15,19,true,'#fff');
  }else{
   for(let i=0;i<block.lines.length;i++)
    text(ctx,block.lines[i],col.right-7,block.y+(i+.5)*block.lineHeight,
     layout.fontSize,false,'#202020');
  }
 }
 return [page.canvas];
}
async function loadNewspaperLogo(){
 if(typeof Image==='undefined'||typeof document==='undefined')
  throw Error('بارگذاری لوگو در این مرورگر ممکن نیست.');
 const logo=new Image();
 const asset=new URL('./assets/payamejadval-logo.webp',document.baseURI).href;
 if(typeof logo.decode==='function'){
  logo.src=asset;
  await logo.decode();
 }else{
  await new Promise((resolve,reject)=>{
   logo.onload=resolve;
   logo.onerror=()=>reject(Error('فایل لوگو در دسترس نیست.'));
   logo.src=asset;
  });
 }
 if(!(logo.naturalWidth||logo.width)||!(logo.naturalHeight||logo.height))
  throw Error('فایل لوگو بارگذاری نشد.');
 return logo;
}
function createPages(item,mode,player,logo){
 const grouped=groups(item,player),pages=[];
 if(item.puzzle.grid.length===15)return newspaperPages(item,mode,grouped,logo);
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
 const logo=item.puzzle.grid.length===15?await loadNewspaperLogo():null;
 const pages=createPages(item,mode,player,logo);
 const bytes=encodePDF(pages);
 const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=filename(item,mode);
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 return {filename:filename(item,mode),pages:pages.length,bytes:bytes.length};
}
function render(container,item,player=root?.PayamePlayer){
 validate(item,player);container.replaceChildren();
 const doc=container.ownerDocument||document;
 const heading=doc.createElement('h2');heading.textContent='دانلود و چاپ جدول کلمات متقاطع';
 const desc=doc.createElement('p');desc.className='muted small';
 desc.textContent='دو نسخهٔ روزنامه‌ای A4 با لوگوی پیام جدول: شبکهٔ بزرگ، سؤال‌ها در ستون‌های مجله‌ای، و پاسخنامهٔ کامل برای چاپ. شبکه و تمام سؤال‌ها در یک صفحهٔ A4 چیده می‌شوند و اندازهٔ نوشته‌ها متناسب با طول متن تنظیم می‌شود.';
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
