(()=>{"use strict";
const $=id=>document.getElementById(id);let puzzles=[],current=null;
const clean=v=>String(v||"").normalize("NFKC").replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/[\u064b-\u065f\u200c\s]/g,"").replace(/[^\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC\u06D5\u0622]/g,"").slice(-1);
const storage=id=>"kids-crossword:"+id;
function verify(p){if(!p||!Array.isArray(p.grid)||p.grid.length!==3||p.grid.some(r=>!Array.isArray(r)||r.length!==3))return false;
 const rows=p.grid.map(r=>r.join("")),cols=[0,1,2].map(c=>p.grid.map(r=>r[c]).join(""));
 const words=[...rows,...cols],clues=[...p.across,...p.down];
 return words.every(w=>[...w].length===3)&&new Set(words).size===6&&clues.length===6&&new Set(clues.map(c=>c.clue)).size===6&&clues.every((c,i)=>c.answer===words[i]&&typeof c.clue==="string"&&c.clue.trim());}
function read(){try{let a=JSON.parse(localStorage.getItem(storage(current.id))||"[]");return a.length===9?a:Array(9).fill("")}catch{return Array(9).fill("")}}
function save(){localStorage.setItem(storage(current.id),JSON.stringify([...document.querySelectorAll(".cell")].map(x=>x.value)))}
function pick(id){current=puzzles.find(p=>p.id===id);if(!current)return;
 history.replaceState(null,"",location.pathname+"?id="+encodeURIComponent(id));
 [...$("picker").children].forEach(b=>b.classList.toggle("active",b.dataset.id===id));
 $("puzzle-title").textContent=current.title;$("board").innerHTML="";
 const previous=read();
 for(let i=0;i<9;i++){const x=document.createElement("input");x.className="cell";x.type="text";x.inputMode="text";x.maxLength=2;x.autocomplete="off";x.spellcheck=false;x.setAttribute("aria-label","ردیف "+(Math.floor(i/3)+1)+"، ستون "+(i%3+1));x.value=previous[i]||"";
 x.addEventListener("input",()=>{x.value=clean(x.value);x.classList.remove("good","bad");save();$("status").textContent="";if(x.value){const all=[...document.querySelectorAll(".cell")];all[(i+1)%9]?.focus()}});$("board").append(x)}
 for(const key of ["across","down"]){$(key).innerHTML="";for(const item of current[key]){const li=document.createElement("li");li.textContent=item.number+". "+item.clue;$(key).append(li)}}
 $("answer").hidden=true;$("status").textContent="";$("game").hidden=false;$("loading").hidden=true;
}
$("check").onclick=()=>{if(!current)return;let correct=0;[...document.querySelectorAll(".cell")].forEach((x,i)=>{const good=x.value===current.grid[Math.floor(i/3)][i%3];x.classList.toggle("good",good);x.classList.toggle("bad",!!x.value&&!good);if(good)correct++});
 $("status").textContent=correct===9?"آفرین! هر ۶ واژه را درست حل کردی! 🎉":"تا اینجا "+correct+" حرف از ۹ حرف درست است. دوباره امتحان کن."};
$("reset").onclick=()=>{if(!current||!confirm("همهٔ حروف این جدول پاک شود؟"))return;document.querySelectorAll(".cell").forEach(x=>{x.value="";x.classList.remove("good","bad")});save();$("status").textContent="";$("answer").hidden=true};
$("reveal").onclick=()=>{if(!current)return;const box=$("answer");box.hidden=!box.hidden;box.textContent=box.hidden?"":"افقی: "+current.across.map(x=>x.answer).join("، ")+"\nعمودی: "+current.down.map(x=>x.answer).join("، ")};
fetch("./data/kids-published.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{puzzles=(data.puzzles||[]).filter(verify).reverse();if(!puzzles.length)throw Error("No valid puzzle");
 for(const p of puzzles){const b=document.createElement("button");b.textContent=p.title;b.dataset.id=p.id;b.onclick=()=>pick(p.id);$("picker").append(b)}
 const target=new URLSearchParams(location.search).get("id");pick(puzzles.some(x=>x.id===target)?target:puzzles[0].id)
}).catch(()=>{$("loading").textContent="فعلاً جدول قابل‌نمایشی پیدا نشد. لطفاً بعداً دوباره امتحان کن."});
})();
