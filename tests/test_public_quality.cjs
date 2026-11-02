const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const quality=require('../quality-gate.js'),player=require('../player.js');
const window={JadvalQuality:quality,PayamePlayer:player};
const document={readyState:'loading',addEventListener(){}};
vm.runInNewContext(fs.readFileSync('public-app.js','utf8'),{window,document,location:{search:''},URLSearchParams,Date,Intl,Promise,console});
const allowed=window.PayamePublic.eligiblePublicPuzzle;
const live=JSON.parse(fs.readFileSync('data/published.json','utf8'));
assert(Array.isArray(live.puzzles));
assert.equal(live.puzzles.length,0,'The pre-review pilot must be removed from the live archive');
const old=JSON.parse(fs.readFileSync('archive/2026-11-01-pilot.json','utf8')).puzzles[0];
assert.equal(old.puzzle.meta.status,'pilot');
assert.equal(allowed(old),false,'Old pilot cannot appear as an approved game');
const rows=[
'#....#.........','#....#.........','#..............','..........#...#',
'...##.....#....','....##.....#...','...............','###.........###',
'...............','...#.....##....','....#.....##...','#...#..........',
'..............#','.........#....#','.........#....#'
];
let counter=0;const alphabet=[...'آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'];
const grid=rows.map((s,r)=>[...s].map((ch,c)=>ch==='#'?'':alphabet[(r*37+c*23+r*c*7)%alphabet.length]));
const slots=quality.audit({grid,clues:{horizontal:{},vertical:{}}}).slots;
const clues={horizontal:{},vertical:{}};
for(const [i,slot] of slots.entries())(clues[slot.dir][String(slot.group)]??=[]).push('سرنخ آزمایشی '+i);
const p={version:3,grid,clues,meta:{status:'published',method:'editor-approved'}};
const item={id:'pub_test_123456789012',title:'جدول معتبر مصنوعی برای تست',puzzle:p};
const audit=quality.audit(p);
assert.deepEqual(audit.errors,[],JSON.stringify(audit.errors.slice(0,6)));
assert.equal(allowed(item),true,'Reviewed, structurally valid publication can appear');
assert.equal(allowed({...item,puzzle:{...p,meta:{status:'draft',method:'editor-approved'}}}),false);
assert.equal(allowed({...item,puzzle:{...p,grid:p.grid.map(row=>row.slice()).reverse()}}),false,'Unsymmetrical invalid grid blocked');
console.log('Public catalogue rejects pilot, drafts and structural violations; structurally valid approved grids remain playable.');
