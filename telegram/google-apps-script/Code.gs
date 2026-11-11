/**
 * Payame Jadval Telegram bot — Google Apps Script edition.
 * Dedicated @PayameJadvalBot, private chats only.
 * No webhook, phone number, Vercel, GitHub authorization, or exposed token.
 *
 * Set Script Property TELEGRAM_CROSSWORD_BOT_TOKEN in Project Settings.
 * Run setupBot() ONCE after disabling GitHub's temporary Telegram polling.
 * Thereafter a one-minute trigger runs pollUpdates() automatically.
 */
var PJ = {
  username: 'PayameJadvalBot',
  wordGameUrl: 'https://nimania.github.io/payamejadval/kalamechin-pro.html',
  repoBase: 'https://raw.githubusercontent.com/nimania/payamejadval/main/telegram/',
  offsetKey: 'PJ_NEXT_UPDATE_OFFSET',
  cacheSeconds: 300,
  maxAgeSeconds: 86400
};

function pjProperties_() {
  return PropertiesService.getScriptProperties();
}

function pjToken_() {
  var token = pjProperties_().getProperty('TELEGRAM_CROSSWORD_BOT_TOKEN');
  if (!token || token.trim().length < 20) {
    throw new Error('Set TELEGRAM_CROSSWORD_BOT_TOKEN in Project Settings > Script Properties.');
  }
  return token.trim();
}

function pjApi_(method, body) {
  var url = 'https://api.telegram.org/bot' + pjToken_() + '/' + method;
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body || {}),
    muteHttpExceptions: true
  });
  var output;
  try { output = JSON.parse(res.getContentText('UTF-8')); }
  catch (e) { throw new Error('Telegram returned an unexpected response for ' + method); }
  if (res.getResponseCode() !== 200 || !output.ok) {
    // Do not print token or full URL.
    throw new Error('Telegram ' + method + ': ' + String(output.description || 'request failed').replace(pjToken_(), '[redacted]'));
  }
  return output.result;
}

/**
 * OPTIONAL first-party analytics. Only Telegram interactions are observable:
 * commands, game requests, and successful widget sends. The widget's local
 * taps, game completion and local scores are not transmitted to this bot.
 *
 * setupAnalytics() creates a PRIVATE Google Sheet in the owner's Drive.
 * Pseudonymous player IDs are salted SHA-256 hashes; names are NOT retained
 * unless a user explicitly sends /showname. /forgetme erases and opts out.
 */
function pjAnalyticsId_() {
  return pjProperties_().getProperty('PJ_ANALYTICS_SHEET_ID') || '';
}
function pjPlayerKey_(id) {
  var salt=pjProperties_().getProperty('PJ_ANALYTICS_SALT');
  if(!salt)throw new Error('Analytics salt missing');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+'|'+String(id))
    .slice(0,16).map(function(x){return ('0'+((x+256)%256).toString(16)).slice(-2)}).join('');
}
function pjAnalyticsSheet_() {
  var id=pjAnalyticsId_();
  if(!id)return null;
  return SpreadsheetApp.openById(id).getSheetByName('رویدادها');
}
function pjTrack_(message,event,puzzleId) {
  if(!pjAnalyticsId_()||!message||!message.from||message.from.id===undefined)return;
  try{
    var h=pjPlayerKey_(message.from.id),pr=pjProperties_();
    if(pr.getProperty('PJ_OPTOUT_'+h)==='1')return;
    var named=pr.getProperty('PJ_NAMED_'+h)==='1';
    var now=new Date(),t=Utilities.formatDate(now,'Asia/Tehran','yyyy-MM-dd HH:mm:ss');
    var name=named?[message.from.first_name||'',message.from.last_name||''].join(' ').trim():'';
    var username=named?(message.from.username||''):'';
    var tab=pjAnalyticsSheet_();
    if(!tab)return;
    tab.appendRow([t,t.slice(0,10),h,String(event).slice(0,40),
      String(puzzleId||'').slice(0,64),name,username]);
  }catch(err){console.warn('Analytics write was skipped; game delivery continues.');}
}
function pjTrackAction_(message,t) {
  var events={
    '⚡ جدول سریع':'request_quick','🧩 جدول اصلی':'request_main',
    '🧩 جدول امروز':'request_main','🔢 سودوکو':'sudoku_menu',
    '🔢 سودوکو آسان':'request_sudoku_easy',
    '🔤 کلمه‌چین':'word_game_open',
    '🔢 سودوکو متوسط':'request_sudoku_medium',
    '🔢 سودوکو سخت':'request_sudoku_hard',
    '🏆 چالش جمعه':'request_friday','📚 آرشیو جدول‌ها':'archive_open',
    '🏅 امتیازهای من':'scores_open','🏆 امتیازهای من':'scores_open',
    '📤 اشتراک‌گذاری':'share_clicked','👥 دعوت دوستان':'share_clicked'
  };
  var event=events[t];
  if(!event){
    if(/^\/start\b/i.test(t))event='start';
    else if(/^\/(quick|jadval|sudoku|kalamechin|today|new|friday|invite|scores|menu)\b/i.test(t))
      event='command_'+t.split(/\s/)[0].replace(/^\/|@.*$/g,'').slice(0,20);
  }
  if(event)pjTrack_(message,event,'');
}

function setupAnalytics() {
  var old=pjAnalyticsId_();
  if(old){
    console.log('Existing private analytics sheet: https://docs.google.com/spreadsheets/d/'+old+'/edit');
    return;
  }
  // Explicit consent of project owner required: run this manually once.
  var book=SpreadsheetApp.create('پیام جدول — آمار خصوصی استفاده');
  book.setSpreadsheetTimeZone('Asia/Tehran');
  var events=book.getActiveSheet();events.setName('رویدادها');
  events.appendRow(['زمان تهران','تاریخ','شناسهٔ ناشناس بازیکن','رویداد',
    'شناسهٔ بازی','نام با رضایت','نام کاربری با رضایت']);
  events.setFrozenRows(1);
  events.getRange('A1:G1').setBackground('#b20a20').setFontColor('#ffffff').setFontWeight('bold');
  events.setColumnWidths(1,2,120);events.setColumnWidth(3,230);
  events.setColumnWidths(4,4,170);
  var report=book.insertSheet('داشبورد');
  report.getRange('A1:B8').setValues([
    ['شاخص','مقدار'],
    ['کاربران یکتای شناخته‌شده','=IFERROR(COUNTA(UNIQUE(FILTER(رویدادها!C2:C,رویدادها!C2:C<>""))),0)'],
    ['مجموع رویدادها','=COUNTA(رویدادها!D2:D)'],
    ['ورود به ربات','=COUNTIF(رویدادها!D2:D,"start")'],
    ['جدول کلمات ارسال‌شده','=COUNTIF(رویدادها!D2:D,"crossword_sent")'],
    ['سودوکوهای ارسال‌شده','=COUNTIF(رویدادها!D2:D,"sudoku_sent")'],
    ['انتخاب اشتراک‌گذاری','=COUNTIF(رویدادها!D2:D,"share_clicked")'],
    ['بازیکنان یکتای امروز','=IFERROR(COUNTA(UNIQUE(FILTER(رویدادها!C2:C,رویدادها!B2:B=TEXT(TODAY(),"yyyy-mm-dd")))),0)']
  ]);
  report.getRange('A1:B1').setBackground('#b20a20').setFontColor('#ffffff').setFontWeight('bold');
  report.setColumnWidth(1,250);report.setColumnWidth(2,190);report.setFrozenRows(1);
  report.getRange('A10:B13').setValues([
    ['دربارهٔ این آمار',''],
    ['ارسال ویجت','پذیرفته‌شدن درخواست ارسال، نه لزوماً مشاهده یا حل'],
    ['حل کامل و زمان حل','هنوز از ویجت به سرور منتقل نمی‌شود'],
    ['نمایش نام','فقط بعد از انتخاب آگاهانهٔ /showname']
  ]);
  var prop=pjProperties_();
  prop.setProperty('PJ_ANALYTICS_SALT',Utilities.getUuid());
  prop.setProperty('PJ_ANALYTICS_SHEET_ID',book.getId());
  // Data retention: 90 days, best effort.
  var triggers=ScriptApp.getProjectTriggers();
  if(!triggers.some(function(x){return x.getHandlerFunction()==='purgeOldAnalytics'}))
    ScriptApp.newTrigger('purgeOldAnalytics').timeBased().everyDays(1).create();
  console.log('Analytics created privately: '+book.getUrl());
}
function purgeOldAnalytics() {
  var tab=pjAnalyticsSheet_();if(!tab)return;
  var rows=tab.getDataRange().getValues(),old=Date.now()-90*86400000;
  for(var i=rows.length-1;i>=1;i--){
    if(Date.parse(String(rows[i][1])+'T00:00:00Z')<old)tab.deleteRow(i+1);
  }
}
function pjForgetUser_(message) {
  if(!pjAnalyticsId_())return false;
  var h=pjPlayerKey_(message.from.id),tab=pjAnalyticsSheet_();
  if(tab){
    var data=tab.getDataRange().getValues();
    for(var i=data.length-1;i>=1;i--)if(data[i][2]===h)tab.deleteRow(i+1);
  }
  var pr=pjProperties_();
  pr.deleteProperty('PJ_NAMED_'+h);
  pr.setProperty('PJ_OPTOUT_'+h,'1');
  return true;
}
function pjSetNameConsent_(message,enable) {
  if(!pjAnalyticsId_())return false;
  var h=pjPlayerKey_(message.from.id),prop=pjProperties_();
  if(enable){
    prop.deleteProperty('PJ_OPTOUT_'+h);
    prop.setProperty('PJ_NAMED_'+h,'1');
  }else{
    prop.deleteProperty('PJ_NAMED_'+h);
    var tab=pjAnalyticsSheet_(),rows=tab.getDataRange().getValues();
    for(var i=1;i<rows.length;i++)if(rows[i][2]===h)
      tab.getRange(i+1,6,1,2).clearContent();
  }
  return true;
}
function analyticsLink() {
  var id=pjAnalyticsId_();
  console.log(id?'Private usage dashboard: https://docs.google.com/spreadsheets/d/'+id+'/edit':
    'Analytics is not enabled. Run setupAnalytics once.');
}

function pjMenu_() {
  return {
    keyboard: [
      [{text: '⚡ جدول سریع'}, {text: '🧩 جدول اصلی'}],
      [{text: '🔢 سودوکو'}, {text: '🏆 چالش جمعه'}],
      [{text: '🔤 کلمه‌چین', web_app: {url: PJ.wordGameUrl}}],
      [{text: '📚 آرشیو جدول‌ها'}],
      [{text: '🏅 امتیازهای من'}, {text: '📤 اشتراک‌گذاری'}]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

function pjWithProgress_(chatId, title, action) {
  // Progress represents completed processing stages, not estimated time or network percentage.
  var progressId=null;
  try {
    var ack=pjApi_('sendMessage',{
      chat_id:chatId,
      text:'⏳ '+title+'\nگام ۱ از ۳: درخواست دریافت شد؛ در حال بررسی انتشار'
    });
    progressId=ack && ack.message_id;
  } catch(e) {
    console.warn('Could not post progress; attempt to deliver game continues.');
  }
  function update(step,detail){
    if(!progressId)return;
    var line=step==='done'?'✅ '+detail:step==='error'?'❌ '+detail:
      '⏳ '+title+'\nگام '+step+' از ۳: '+detail;
    try{pjApi_('editMessageText',{chat_id:chatId,message_id:progressId,text:line});}
    catch(e){console.warn('Progress message update skipped.');}
  }
  try{
    var result=action(update);
    update('done','بررسی انجام شد؛ نتیجه در پیام بعدی ارسال شده است.');
    return result;
  }catch(error){
    update('error','آماده‌سازی یا ارسال بازی ناموفق بود. دوباره تلاش کن؛ اگر ادامه داشت /menu را بزن.');
    throw error;
  }
}

function pjSendMessage_(chatId, message, keyboard) {
  return pjApi_('sendMessage', {
    chat_id: chatId, text: message, reply_markup: keyboard || pjMenu_()
  });
}
function pjSudokuKeyboard_() {
  return {keyboard:[
    [{text:'🔢 سودوکو آسان'}, {text:'🔢 سودوکو متوسط'}, {text:'🔢 سودوکو سخت'}],
    [{text:'🏠 منوی اصلی'}]
  ],resize_keyboard:true,is_persistent:true};
}

function pjCatalogue_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('pj-catalog-v2');
  if (cached) return JSON.parse(cached);
  var res = UrlFetchApp.fetch(PJ.repoBase + 'catalog.json', {muteHttpExceptions: true});
  if (res.getResponseCode() !== 200) throw new Error('Crossword catalogue unavailable');
  var data = JSON.parse(res.getContentText('UTF-8'));
  if (data.schema !== 1 || !Array.isArray(data.puzzles)) throw new Error('Invalid crossword catalogue');
  var puzzles = data.puzzles.filter(function(p) {
    return p && p.kind === 'crossword' && [5,7,9].indexOf(p.size) >= 0
      && /^[a-z0-9-]{4,64}$/.test(p.id)
      && /^telegram\/[A-Za-z0-9-]+\.html$/.test(p.path)
      && ((p.status === 'approved' && p.editorApproved === true)
       || (p.status === 'private-trial' && p.allowPrivateTrial === true));
  });
  cache.put('pj-catalog-v2', JSON.stringify(puzzles), PJ.cacheSeconds);
  return puzzles;
}

function pjWidgetHtml_(puzzle) {
  var url = 'https://raw.githubusercontent.com/nimania/payamejadval/main/' + puzzle.path;
  var res = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
  if (res.getResponseCode() !== 200) throw new Error('Crossword widget unavailable');
  var bytes = res.getContent().length;
  if (bytes < 1 || bytes > 32768) throw new Error('Crossword HTML size outside Telegram limits');
  var html = res.getContentText('UTF-8');
  if (html.indexOf('const G=') === -1 || html.indexOf('const G =') === -1 && html.indexOf('🧩') === -1) {
    throw new Error('Unexpected widget HTML');
  }
  // Telegram also validates the <=4096-byte zlib-compressed limit.
  return html;
}

function pjTehranDay_() {
  return Number(Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyyMMdd'));
}

function pjShareLinks_(puzzle) {
  var deep = 'https://t.me/PayameJadvalBot?start=p_' + puzzle.id;
  var web = /^https:\/\/nimania\.github\.io\/payamejadval\/[A-Za-z0-9-]+\.html$/.test(puzzle.webUrl || '')
    ? puzzle.webUrl : 'https://nimania.github.io/payamejadval/';
  return {bot:deep,web:web};
}

function pjSendPuzzle_(chatId, puzzle, sourceMessage, progress) {
  var links = pjShareLinks_(puzzle);
  if(progress)progress(2,'بارگذاری و کنترل فایل جدول');
  var html=pjWidgetHtml_(puzzle);
  if(progress)progress(3,'ارسال جدول به تلگرام');
  pjApi_('sendWidget', {
    chat_id:chatId,
    html:html,
    caption:'🧩 ' + puzzle.title +
      (puzzle.status === 'private-trial' ? '\nجدول آزمایشی ـ رتبه‌بندی رسمی ندارد' : '') +
      '\nفرستادن همین جدول: ' + links.bot,
    allow_queries:false,
    is_shared:false,
    reply_markup:{inline_keyboard:[[
      {text:'🌐 اگر جدول خالی بود؛ نسخه وب',url:links.web}
    ]]}
  });
  pjTrack_(sourceMessage,'crossword_sent',puzzle.id);
}

function pjFindPuzzle_(id) {
  var matches=pjCatalogue_().filter(function(p){return p.id===id;});
  return matches.length===1?matches[0]:null;
}

function pjDaily_(p) {
  var today=Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd');
  return p.status==='approved' && p.editorApproved===true && p.publishDate===today;
}

function pjPuzzle_(chatId, mode, sourceMessage, progress) {
  var puzzles=pjCatalogue_(),filtered=[],info='';
  if (mode==='quick') {
    filtered=puzzles.filter(function(p){return p.size===5 && pjDaily_(p);});
    info='هنوز جدول سریع ۵×۵ تأییدشده‌ای برای امروز منتشر نشده است.';
  } else if (mode==='friday') {
    var date=Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd');
    if (new Date(date+'T12:00:00Z').getUTCDay()!==5) {
      pjSendMessage_(chatId,'🏆 چالش ۹×۹ هر جمعه منتشر می‌شود. در روز جمعه دوباره بررسی کن.');
      return;
    }
    filtered=puzzles.filter(function(p){return p.size===9 && pjDaily_(p);});
    info='چالش ۹×۹ این جمعه هنوز آماده یا تأیید نشده است.';
  } else {
    filtered=puzzles.filter(function(p){return p.size===7 && pjDaily_(p);});
    if (!filtered.length) {
      // Keep the existing private demo accessible, but never call it "today's official puzzle".
      filtered=puzzles.filter(function(p){return p.size===7 && p.status==='private-trial';});
    }
    info='جدول اصلی ۷×۷ امروز هنوز منتشر نشده است.';
  }
  if (mode==='different') {
    filtered=puzzles.filter(function(p){return p.size===7;});
    if (filtered.length<2){pjSendMessage_(chatId,'فعلاً جدول ۷×۷ دوم برای انتخاب متفاوت آماده نیست.');return;}
    pjSendPuzzle_(chatId,filtered[(pjTehranDay_()+1)%filtered.length],sourceMessage,progress);
    return;
  }
  if (!filtered.length){pjSendMessage_(chatId,info);return;}
  pjSendPuzzle_(chatId,filtered[pjTehranDay_()%filtered.length],sourceMessage,progress);
}

function pjShare_(chatId) {
  var puzzles=pjCatalogue_().filter(function(p){return p.size===7;});
  if (!puzzles.length){pjSendMessage_(chatId,'هنوز جدولی برای اشتراک‌گذاری آماده نیست.');return;}
  var latest=puzzles.find(function(p){return pjDaily_(p);})||puzzles[0],links=pjShareLinks_(latest);
  pjApi_('sendMessage',{
    chat_id:chatId,
    text:'📤 دو راه برای دعوت دوستان:\n\n' +
      '۱. همین جدول داخل ربات تلگرام:\n'+links.bot+'\n\n' +
      '۲. حل همان جدول در مرورگر و ارسال لینک به واتس‌اپ و دیگر برنامه‌ها:\n'+links.web+
      '\n\nدر نسخهٔ عمومی تلگرام، خودِ پیام ویجت هنوز قابل فوروارد نیست؛ لینک آن قابل اشتراک‌گذاری است.',
    reply_markup:{inline_keyboard:[
      [{text:'📨 فرستادن به دوستان تلگرام',
        url:'https://t.me/share/url?url='+encodeURIComponent(links.bot)+'&text='+encodeURIComponent('🧩 بیا این جدول را حل کنیم!')}],
      [{text:'🌐 بازی در مرورگر',url:links.web}]
    ]}
  });
}


function pjSudokuList_() {
  var cache=CacheService.getScriptCache(),key='pj-daily-sudoku-v1';
  var cached=cache.get(key);
  if(cached)return JSON.parse(cached);
  var url='https://raw.githubusercontent.com/nimania/payamejadval/main/data/daily-games.json';
  var res=UrlFetchApp.fetch(url,{muteHttpExceptions:true});
  if(res.getResponseCode()!==200)throw new Error('Sudoku bank unavailable');
  var data=JSON.parse(res.getContentText('UTF-8'));
  if(data.schema!==1||!Array.isArray(data.items))throw new Error('Invalid daily games catalog');
  var items=data.items.filter(pjValidSudoku_);
  cache.put(key,JSON.stringify(items),PJ.cacheSeconds);
  return items;
}

function pjValidSudoku_(item) {
  if(!item || item.type!=='sudoku' || !item.puzzle ||
     !/^sudoku-20\d\d-\d\d-\d\d-(easy|medium|hard)$/.test(String(item.id)) ||
     !/^20\d\d-\d\d-\d\dT/.test(String(item.publishedAt)) ||
     !/^[0-9]{81}$/.test(String(item.puzzle.givens||'')) ||
     !/^[1-9]{81}$/.test(String(item.puzzle.solution||'')) ||
     item.puzzle.quality?.unique!==true)return false;
  var a=item.puzzle.givens,b=item.puzzle.solution,groups=[];
  for(var i=0;i<81;i++)if(a[i]!=='0'&&a[i]!==b[i])return false;
  for(var r=0;r<9;r++){
    var row='',col='';
    for(var c=0;c<9;c++){row+=b[r*9+c];col+=b[c*9+r]}
    groups.push(row,col);
  }
  for(var br=0;br<3;br++)for(var bc=0;bc<3;bc++){
    var box='';
    for(var rr=0;rr<3;rr++)for(var cc=0;cc<3;cc++)box+=b[(br*3+rr)*9+bc*3+cc];
    groups.push(box);
  }
  return groups.every(function(x){return new Set(x).size===9;});
}

function pjReleasedSudoku_(item) {
  return Date.parse(item.publishedAt)<=Date.now();
}

function pjSudokuToday_(difficulty) {
  var today=Utilities.formatDate(new Date(),'Asia/Tehran','yyyy-MM-dd');
  var matches=pjSudokuList_().filter(function(x){
    return x.id==='sudoku-'+today+'-'+difficulty && pjReleasedSudoku_(x);
  });
  return matches.length===1?matches[0]:null;
}

function pjSendSudoku_(chatId,item,sourceMessage,progress) {
  if(progress)progress(2,'دریافت و اعتبارسنجی سودوکو');
  var res=UrlFetchApp.fetch(PJ.repoBase+'sudoku-widget-template.html',{muteHttpExceptions:true});
  if(res.getResponseCode()!==200)throw new Error('Sudoku widget template unavailable');
  var template=res.getContentText('UTF-8');
  if(template.indexOf('__PUZZLE__')<0)throw new Error('Sudoku template marker missing');
  var q={id:item.id,date:item.id.slice(7,17),title:item.title,
    givens:item.puzzle.givens,solution:item.puzzle.solution};
  var html=template.replace('__PUZZLE__',JSON.stringify(q));
  if(html.length>32768)throw new Error('Sudoku widget too large');
  if(progress)progress(3,'ارسال سودوکو به تلگرام');
  pjApi_('sendWidget',{
    chat_id:chatId,html:html,
    caption:'🔢 '+item.title+'\nچالش همین جدول: https://t.me/PayameJadvalBot?start=s_'+item.id+
      '\nامتیاز فعلاً آزمایشی و محلی است.',
    allow_queries:false,is_shared:false,
    reply_markup:{inline_keyboard:[[
      {text:'🌐 اگر سودوکو نمایش داده نشد؛ نسخه وب',
       url:'https://nimania.github.io/payamejadval/?type=sudoku&id='+encodeURIComponent(item.id)}
    ]]}
  });
  pjTrack_(sourceMessage,'sudoku_sent',item.id);
}

function pjSudoku_(chatId,level,sourceMessage,progress) {
  var p=pjSudokuToday_(level);
  if(!p){
    var today=Utilities.formatDate(new Date(),'Asia/Tehran','yyyy-MM-dd');
    var all=pjSudokuList_();
    var next=all.find(function(x){return x.id==='sudoku-'+today+'-'+level;});
    var timestr=next?Utilities.formatDate(new Date(next.publishedAt),'Asia/Tehran','HH:mm'):null;
    var previous=all.filter(function(x){
      return x.puzzle.difficulty===level && pjReleasedSudoku_(x);
    }).sort(function(a,b){return Date.parse(b.publishedAt)-Date.parse(a.publishedAt);})[0];
    var label={easy:'آسان',medium:'متوسط',hard:'سخت'}[level]||level;
    var note=next?'سودوکوی '+label+' امروز ساعت '+timestr+' به وقت تهران منتشر می‌شود.':
      'سودوکوی '+label+' امروز هنوز منتشر نشده است.';
    pjSendMessage_(chatId,note+(previous?'\nتا آن موقع آخرین سودوکوی منتشرشده را می‌فرستم.':
      '\nفعلاً سودوکوی منتشرشدهٔ قبلی هم در دسترس نیست.'),pjSudokuKeyboard_());
    if(previous)pjSendSudoku_(chatId,previous,sourceMessage,progress);
    return;
  }
  pjSendSudoku_(chatId,p,sourceMessage,progress);
}

function pjSudokuExact_(chatId,id,sourceMessage) {
  var items=pjSudokuList_().filter(function(x){return x.id===id&&pjReleasedSudoku_(x)});
  if(items.length!==1){pjSendMessage_(chatId,'این سودوکو هنوز منتشر نشده یا در بانک معتبر نیست.');return;}
  pjSendSudoku_(chatId,items[0],sourceMessage);
}

function pjHandle_(message) {
  var chat = message && message.chat;
  var sender = message && message.from;
  if (!chat || chat.type !== 'private' || !sender || sender.id !== chat.id) return;
  if (!message.text) return;
  var t = String(message.text).trim();
  var command = t.split(/\s+/)[0].toLowerCase();
  if(/^\/forgetme(@payamejadvalbot)?$/.test(command)){
    var forgotten=pjForgetUser_(message);
    pjSendMessage_(chat.id,forgotten?'اطلاعات آماری پیشین تو پاک شد و ثبت رویدادهای بعدی برایت خاموش است.':'هنوز دفتر آمار مرکزی فعال نیست؛ اطلاعاتی از تو ذخیره نشده است.');
    return;
  }
  if(/^\/showname(@payamejadvalbot)?$/.test(command)){
    pjSendMessage_(chat.id,pjSetNameConsent_(message,true)?
      'نمایش نام و نام کاربری‌ات در آمار خصوصی مدیر را با رضایت فعال کردی. هر وقت خواستی /hidename یا /forgetme بزن.':
      'هنوز سامانهٔ آمار فعال نیست.');
    return;
  }
  if(/^\/hidename(@payamejadvalbot)?$/.test(command)){
    pjSendMessage_(chat.id,pjSetNameConsent_(message,false)?
      'نام و نام کاربری از گزارش‌های ذخیره‌شده پاک شد. رویدادها همچنان با شناسهٔ ناشناس ثبت می‌شوند.':
      'هنوز سامانهٔ آمار فعال نیست.');
    return;
  }
  if(/^\/privacy(@payamejadvalbot)?$/.test(command)){
    pjSendMessage_(chat.id,'🛡 آمار استفاده: در صورت فعال بودن دفتر آمار، فقط نوع درخواست بازی، زمان، موفقیت ارسال و شناسهٔ ناشناس ثبت می‌شود. نام و نام کاربری فقط با فرمان /showname ذخیره می‌شود.\n\nبرای حذف همهٔ داده‌ها و توقف ثبت: /forgetme\nبرای پنهان‌کردن نام: /hidename\nامتیازها، پاسخ‌ها و زمان حل فعلاً به ربات فرستاده نمی‌شوند.');
    return;
  }
  pjTrackAction_(message,t);
  var start=t.match(/^\/start(?:@payamejadvalbot)?(?:\s+([ps])_([A-Za-z0-9_-]{4,61}))?$/i);
  if (start) {
    if (start[1]==='p') {
      var chosen=pjFindPuzzle_(start[2]);
      if (chosen) pjSendPuzzle_(chat.id,chosen,message);
      else pjSendMessage_(chat.id,'این جدول در آرشیو فعال پیدا نشد. از منوی بازی، جدول موجود را انتخاب کن.');
    } else if(start[1]==='s') {
      pjSudokuExact_(chat.id,start[2],message);
    } else {
      pjSendMessage_(chat.id, '🧩 به پیام جدول خوش آمدی!\n⚡ جدول سریع ۵×۵ | 🧩 جدول اصلی ۷×۷ | 🔢 سودوکو | 🔤 کلمه‌چین | جمعه‌ها ۹×۹\nآمار استفاده فقط با شناسهٔ ناشناس ثبت می‌شود؛ دربارهٔ آن: /privacy');
    }
  } else if (/^\/menu(@payamejadvalbot)?$/.test(command)) {
    pjSendMessage_(chat.id,'🧩 از منوی پایین یک بازی انتخاب کن.');
  } else if (t==='⚡ جدول سریع' || /^\/quick(@payamejadvalbot)?$/.test(command)) {
    pjWithProgress_(chat.id,'جدول سریع ۵×۵',function(update){pjPuzzle_(chat.id,'quick',message,update);});
  } else if (t==='🧩 جدول اصلی' || t==='🧩 جدول امروز' ||
             /^\/(jadval|today)(@payamejadvalbot)?$/.test(command)) {
    pjWithProgress_(chat.id,'جدول اصلی',function(update){pjPuzzle_(chat.id,'main',message,update);});
  } else if (t==='🔤 کلمه‌چین' || /^\/kalamechin(@payamejadvalbot)?$/.test(command)) {
    pjApi_('sendMessage', {
      chat_id:chat.id,
      text:'🔤 کلمه‌چین: بازی اتصال حروف با ۵۰ مرحله. پیشرفت نسخهٔ فعلی روی همین دستگاه ذخیره می‌شود.',
      reply_markup:{inline_keyboard:[[{text:'🎮 شروع بازی کلمه‌چین',web_app:{url:PJ.wordGameUrl}}]]}
    });
  } else if (t==='🔢 سودوکو' || /^\/sudoku(@payamejadvalbot)?$/.test(command)) {
    pjSendMessage_(chat.id,'🔢 سطح سودوکوی امروز را انتخاب کن. هر سطح یک جدول مشترک برای همه است.',pjSudokuKeyboard_());
  } else if (t==='🔢 سودوکو آسان' || t==='🔢 سودوکو متوسط' || t==='🔢 سودوکو سخت') {
    pjWithProgress_(chat.id,'سودوکو',function(update){pjSudoku_(chat.id,t.indexOf('آسان')>=0?'easy':t.indexOf('متوسط')>=0?'medium':'hard',message,update);});
  } else if (t==='🏠 منوی اصلی') {
    pjSendMessage_(chat.id,'🧩 از منوی اصلی بازی انتخاب کن.');
  } else if (t==='🏆 چالش جمعه' || /^\/friday(@payamejadvalbot)?$/.test(command)) {
    pjWithProgress_(chat.id,'چالش جمعه',function(update){pjPuzzle_(chat.id,'friday',message,update);});
  } else if (t==='📚 آرشیو جدول‌ها') {
    pjSendMessage_(chat.id,'📚 آرشیو و بازی‌های منتشرشده:\nhttps://nimania.github.io/payamejadval/\n\nبرای بازی داخل همین چت، از لینک اختصاصی هر جدول استفاده کن.');
  } else if (t==='🏅 امتیازهای من' || t==='🏆 امتیازهای من' ||
             /^\/scores(@payamejadvalbot)?$/.test(command)) {
    pjSendMessage_(chat.id,'🏅 امتیاز فعلی در ویجت فقط روی دستگاه محاسبه می‌شود و غیررسمی است. رتبه‌بندی مرکزی و رقابت هفتگی هنوز فعال نشده‌اند.');
  } else if (t==='📤 اشتراک‌گذاری' || t==='👥 دعوت دوستان' ||
             /^\/invite(@payamejadvalbot)?$/.test(command)) {
    pjShare_(chat.id);
  } else if (t==='🎲 یک جدول متفاوت' || /^\/new(@payamejadvalbot)?$/.test(command)) {
    pjWithProgress_(chat.id,'جدول متفاوت',function(update){pjPuzzle_(chat.id,'different',message,update);});
  }
}

/**
 * Execute ONCE from Apps Script's Run button.
 * It checks bot identity, refuses an existing webhook, discards stale messages,
 * registers a private-chat menu and creates an every-minute trigger.
 */
function setupBot() {
  var me = pjApi_('getMe');
  if (String(me.username || '').toLowerCase() !== 'payamejadvalbot') {
    throw new Error('Wrong Telegram bot token; expected @PayameJadvalBot');
  }
  var hook = pjApi_('getWebhookInfo');
  if (hook.url) {
    throw new Error('Existing Telegram webhook detected. Do not switch receiving modes until it is disabled deliberately.');
  }
  pjApi_('setMyCommands', {commands: [
    {command:'start',description:'منوی بازی'},
    {command:'jadval',description:'جدول اصلی ۷×۷'},
    {command:'quick',description:'جدول سریع ۵×۵'},
    {command:'sudoku',description:'سودوکوی روزانه'},
    {command:'kalamechin',description:'بازی مرحله‌ای کلمه‌چین'},
    {command:'friday',description:'چالش جمعه ۹×۹'},
    {command:'invite',description:'اشتراک جدول'},
    {command:'new',description:'جدول متفاوت'},
    {command:'scores',description:'امتیازهای من'},
    {command:'privacy',description:'حریم خصوصی و آمار'},
    {command:'forgetme',description:'حذف داده‌های آماری من'}
  ]});

  // Don't replay the old backlog as surprise messages to earlier testers.
  var newest = pjApi_('getUpdates', {offset:-1,limit:1,timeout:0,allowed_updates:['message']});
  if (newest.length) {
    var next = Number(newest[0].update_id) + 1;
    pjApi_('getUpdates', {offset:next,limit:1,timeout:0,allowed_updates:['message']});
    pjProperties_().setProperty(PJ.offsetKey, String(next));
  }

  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'pollUpdates') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('pollUpdates').timeBased().everyMinutes(1).create();
  console.log('PayameJadvalBot ready: one-minute polling enabled. Send /start again to test.');
}

/** Trigger entry point. Does not touch unrelated bots or channels. */
function pollUpdates() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(500)) return;
  try {
    var prop = pjProperties_();
    var offset = Number(prop.getProperty(PJ.offsetKey) || 0);
    for (var batch = 0; batch < 3; batch++) {
      var updates = pjApi_('getUpdates', {offset:offset,limit:100,timeout:0,allowed_updates:['message']});
      if (!updates.length) break;
      for (var i = 0; i < updates.length; i++) {
        var u = updates[i];
        if (u.message) {
          var date = Number(u.message.date || 0);
          if (date && Date.now()/1000 - date < PJ.maxAgeSeconds) {
            try{pjHandle_(u.message);}
            catch(err){
              console.error('Game delivery failed: '+String(err.message||err).replace(pjToken_(),'[redacted]'));
              try{pjSendMessage_(u.message.chat.id,
                '❌ در ارسال بازی مشکلی پیش آمد. درخواست را دوباره بفرست یا /menu را باز کن.');}
              catch(e){console.error('Could not deliver the game error notice.');}
            }
          }
        }
        // Commit only after successful handling of the update.
        offset = Number(u.update_id) + 1;
        prop.setProperty(PJ.offsetKey, String(offset));
      }
      if (updates.length < 100) break;
    }
  } finally {
    lock.releaseLock();
  }
}

/** Optional immediate test: send /start in Telegram, then run this manually. */
function testNow() {
  pollUpdates();
}

/** Stop the scheduled bot. This does not delete any Telegram webhook. */
function stopBot() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'pollUpdates') ScriptApp.deleteTrigger(t);
  });
  console.log('Google Apps Script polling stopped.');
}
