const assert=require('node:assert/strict');
const player=require('../player.js'),pdf=require('../print-pdf.js');
const n=7,grid=Array.from({length:n},()=>Array(n).fill('ا'));
grid[0]=['ا','ب','','پ','ت','ث','ج'];
const slots=player.slotsFor(grid),clues={horizontal:{},vertical:{}};
for(const [i,slot] of slots.entries())
 (clues[slot.dir][String(slot.group)]??=[]).push('سؤال شماره '+(i+1));
const item={id:'pub_sample_1234567890',title:'جدول کلمات متقاطع فارسی',puzzle:{version:3,grid,clues}};
assert(player.validateItem(item));
const grouped=pdf.groups(item,player);
assert.equal(grouped.horizontal[0].number,1);
assert.equal(grouped.horizontal[0].part,1);
assert.equal(grouped.horizontal[0].answer,'جثتپ');
assert.equal(grouped.horizontal[1].answer,'با');
assert.equal(grouped.vertical.length>0,true);
assert.equal(pdf.filename(item,'blank'),'payamejadval-pub_sample_1234567890-blank.pdf');
assert.equal(pdf.filename(item,'answers'),'payamejadval-pub_sample_1234567890-answers.pdf');
let imageCount=0,texts=[],logosDrawn=0;
global.document={createElement(tag){
 if(tag!=='canvas')throw Error('Only canvas is expected in PDF rendering test');
 return {width:0,height:0,getContext(){
  return {direction:'rtl',textAlign:'right',textBaseline:'middle',fillStyle:'#fff',strokeStyle:'#fff',
   lineWidth:1,fillRect(){},strokeRect(){},drawImage(){logosDrawn++},beginPath(){},moveTo(){},lineTo(){},stroke(){},
   measureText(t){return {width:String(t).length*13}},
   fillText(t){texts.push(String(t))}};
 },toDataURL(){
  imageCount++;
  return 'data:image/jpeg;base64,'+Buffer.from([0xff,0xd8,0xff,0xd9]).toString('base64');
 }};
}};
global.atob=s=>Buffer.from(s,'base64').toString('binary');
for(const mode of ['blank','answers']){
 const pages=pdf.createPages(item,mode,player);
 assert(pages.length>=2,'Grid and clues must each have print space');
 const bytes=pdf.encodePDF(pages),str=Buffer.from(bytes).toString('latin1');
 assert(str.startsWith('%PDF-1.4'));
 assert(str.includes('/MediaBox [0 0 595.28 841.89]'),'All pages A4');
 assert(str.includes('/Count '+pages.length));
 assert(str.endsWith('%%EOF'));
 assert(str.includes('startxref'));
 assert(str.includes('/Filter /DCTDecode'));
 assert(str.includes('/XObject'));
}
assert(texts.some(x=>x.includes('افقی')),'Clue list should include across heading');
assert(texts.some(x=>x.includes('عمودی')),'Clue list should include down heading');
assert(texts.some(x=>x.includes('سؤال شماره')),'Clues come from published puzzle');
assert(texts.some(x=>x.includes('جثتپ')),'Answer-key must include real across answer');
assert.throws(()=>pdf.groups({...item,puzzle:{...item.puzzle,clues:{horizontal:{},vertical:{}}}},player));
// The 15×15 newspaper layout uses the real brand image and dense RTL columns.
const grid15=Array.from({length:15},()=>Array(15).fill('ا'));
const slots15=player.slotsFor(grid15),clues15={horizontal:{},vertical:{}};
for(const [i,slot] of slots15.entries())
 (clues15[slot.dir][String(slot.group)]??=[]).push('نمونهٔ سؤال روزنامه‌ای '+(i+1));
const issue15={id:'pub_newspaper_sample',title:'جدول شماره ۱ ـ ۱۳ آبان ۱۴۰۵',
 puzzle:{version:3,grid:grid15,clues:clues15}};
assert(player.validateItem(issue15));
const logo={naturalWidth:1000,naturalHeight:350};
const textStart=texts.length;
const newspaperBlank=pdf.createPages(issue15,'blank',player,logo);
assert(newspaperBlank.length>=1);
const blankText=texts.slice(textStart);
assert(blankText.some(x=>x.includes('جدول کلمات متقاطع')),'Newspaper masthead is printed');
assert(blankText.some(x=>x.includes('نمونهٔ سؤال روزنامه‌ای')),'Questions share the main newspaper page');
assert(!blankText.some(x=>x.includes('پاسخ:')),'Unsolved PDF must not reveal word answers');
const answerStart=texts.length;
const newspaperAnswers=pdf.createPages(issue15,'answers',player,logo);
assert(newspaperAnswers.length>=1);
const answerText=texts.slice(answerStart);
assert(answerText.some(x=>x.includes('پاسخ:')),'Answer edition includes textual answers');
assert(logosDrawn>=2,'The publication logo should be drawn on both PDF editions');
const answerPDF=Buffer.from(pdf.encodePDF(newspaperAnswers)).toString('latin1');
assert(answerPDF.includes('/MediaBox [0 0 595.28 841.89]'),'Newspaper PDF pages are A4');
const longIssue=JSON.parse(JSON.stringify(issue15));
for(const dir of ['horizontal','vertical'])
 for(const row of Object.values(longIssue.puzzle.clues[dir]))
  for(let i=0;i<row.length;i++)row[i]+=' شرح طولانی چاپی'.repeat(22);
assert(player.validateItem(longIssue));
assert(pdf.createPages(longIssue,'blank',player,logo).length>1,
 'Long newspaper clue lists should automatically continue onto more A4 pages');
console.log('15x15 newspaper PDF tested: large paper grid, image logo, RTL compact clues, spoiler-free blank, filled key, continuation.');
console.log('Direct A4 PDF generator tests passed: grid, RTL clue order, filled answers, correct PDF structure and print layouts.');
