/* Public text lexicon must pair each clue with the correct RTL slot answer. */
const assert=require('node:assert/strict');
const player=require('../player.js');
const glossary=require('../glossary.js');
const grid=Array.from({length:7},()=>Array(7).fill('ا'));
grid[0]=['ا','ب','','پ','ت','ث','ج'];
const slots=player.slotsFor(grid),clues={horizontal:{},vertical:{}};
for(const [i,slot] of slots.entries()){
 const clue=i===0?'واژهٔ نخست، با خط تیره - در متن':'تعریف مستقل '+i;
 (clues[slot.dir][String(slot.group)]??=[]).push(clue);
}
const item={id:'pub_test_1234567890',title:'جدول آزمایشی',puzzle:{version:3,grid,clues}};
assert(player.validateItem(item));
const result=glossary.entries(item,player);
const across=result.horizontal.filter(e=>e.number===1);
assert.equal(across.length,2);
assert.equal(across[0].answer,'جثتپ','Rightmost across entry must be first');
assert.equal(across[1].answer,'با','Left-hand across entry must follow');
assert.equal(across[0].part,1);
assert.equal(across[1].part,2);
assert.equal(across[0].total,2);
assert.equal(across[0].clue,'واژهٔ نخست، با خط تیره - در متن',
 'Do not split a clue by a literal hyphen.');
assert(result.vertical.length>0);
for(const direction of ['horizontal','vertical']){
 const grouped={};
 for(const entry of result[direction]){
  const source=slots.find(slot=>slot.dir===direction&&slot.group===entry.number&&
   slot.answer===entry.answer);
  assert(source,'All displayed answers must come from the actual published grid');
  (grouped[entry.number]??=[]).push(entry);
 }
 for(const [number,entries] of Object.entries(grouped))
  assert.deepEqual(entries.map(x=>x.clue),clues[direction][number],
   'Each question must match its ordered slot, not a concatenated clue line');
}
const doc={createElement(tag){return new Element(tag,doc)}};
class Element{
 constructor(tag,ownerDocument){this.tagName=tag;this.ownerDocument=ownerDocument;this.children=[];
  this.attributes={};this.textContent='';this.className='';this.events=new Map();this.open=false;}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(name,value){this.attributes[name]=value}
 addEventListener(name,fn){this.events.set(name,fn)}
}
const target=new Element('section',doc);
const rendered=glossary.render(target,item,player);
assert.equal(rendered.count,slots.length);
assert.equal(target.children[0].tagName,'details');
assert.equal(target.children[0].open,false,'Correct answers should be hidden until disclosure');
const fullText=glossary.asText(result,item);
assert(fullText.includes('افقی\n'));
assert(fullText.includes('عمودی\n'));
assert(fullText.includes('واژهٔ نخست، با خط تیره - در متن — پاسخ: جثتپ'));
assert(fullText.includes('پاسخ: با'));
const bad=JSON.parse(JSON.stringify(item));
bad.puzzle.clues.horizontal['1'].pop();
assert.throws(()=>glossary.entries(bad,player),/معتبر/,'Mismatched clue lists must never generate false pairs');
assert(!fullText.includes('admin')&&!fullText.includes('bank-private'));
console.log('Glossary tested: direct public puzzle, multi-answer RTL clue pairing, spoiler disclosure, plain-text copy and no private data.');
