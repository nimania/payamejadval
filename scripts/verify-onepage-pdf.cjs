/* Independent offline layout check against the actual public crossword snapshot
   built from Firestore during deployment. Uses conservative Persian text metrics.
   No bank records or private Firebase data. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const player=require('../player.js'),print=require('../print-pdf.js');
const source=process.argv[2]||'public/data/published.json';
const archive=JSON.parse(fs.readFileSync(source,'utf8'));
global.document={
 createElement(name){
  if(name!=='canvas')throw Error('Unexpected element '+name);
  const ctx={
   font:'16px Tahoma', fillStyle:'#fff',strokeStyle:'#111',lineWidth:1,
   fillRect(){},strokeRect(){},fillText(){},beginPath(){},
   moveTo(){},lineTo(){},stroke(){},drawImage(){},
   measureText(x){
    const px=Number(this.font.match(/(\d+)px/)?.[1]||16);
    // Deliberately slightly wider than average shaped Persian glyphs.
    const weight=[...String(x)].reduce((v,ch)=>v+
      (ch===' '?0.27:/[ا۱۱۲۳۴۵۶۷۸۹۰0-9]/.test(ch)?0.38:0.58),0);
    return {width:weight*px};
   }
  };
  return {width:1240,height:1754,getContext:()=>ctx};
 }
};
let checked=0;
for(const item of archive.puzzles||[]){
 if(item.puzzle?.grid?.length!==15)continue;
 assert(player.validateItem(item),'Published record must be playable');
 const clues=print.groups(item,player);
 const lengths={horizontal:clues.horizontal.length,vertical:clues.vertical.length};
 for(const mode of ['blank','answers']){
  const pages=print.createPages(item,mode,player,{naturalWidth:900,naturalHeight:300});
  assert.equal(pages.length,1,'Printable edition must have exactly one A4 sheet');
 }
 checked++;
 console.log('Verified one-page A4 worksheet and key:',item.id,JSON.stringify(lengths));
}
if(!checked)console.log('No 15×15 puzzle available to test in archive');
