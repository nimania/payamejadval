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

function pjMenu_() {
  return {
    keyboard: [
      [{text: '⚡ جدول سریع'}, {text: '🧩 جدول اصلی'}],
      [{text: '🏆 چالش جمعه'}, {text: '📚 آرشیو جدول‌ها'}],
      [{text: '🏅 امتیازهای من'}, {text: '📤 اشتراک‌گذاری'}]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

function pjSendMessage_(chatId, message) {
  return pjApi_('sendMessage', {
    chat_id: chatId, text: message, reply_markup: pjMenu_()
  });
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

function pjSendPuzzle_(chatId, puzzle) {
  var links = pjShareLinks_(puzzle);
  pjApi_('sendWidget', {
    chat_id:chatId,
    html:pjWidgetHtml_(puzzle),
    caption:'🧩 ' + puzzle.title +
      (puzzle.status === 'private-trial' ? '\nجدول آزمایشی ـ رتبه‌بندی رسمی ندارد' : '') +
      '\nفرستادن همین جدول: ' + links.bot,
    allow_queries:false,
    is_shared:false
  });
}

function pjFindPuzzle_(id) {
  var matches=pjCatalogue_().filter(function(p){return p.id===id;});
  return matches.length===1?matches[0]:null;
}

function pjDaily_(p) {
  var today=Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd');
  return p.status==='approved' && p.editorApproved===true && p.publishDate===today;
}

function pjPuzzle_(chatId, mode) {
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
    pjSendPuzzle_(chatId,filtered[(pjTehranDay_()+1)%filtered.length]);
    return;
  }
  if (!filtered.length){pjSendMessage_(chatId,info);return;}
  pjSendPuzzle_(chatId,filtered[pjTehranDay_()%filtered.length]);
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

function pjHandle_(message) {
  var chat = message && message.chat;
  var sender = message && message.from;
  if (!chat || chat.type !== 'private' || !sender || sender.id !== chat.id) return;
  if (!message.text) return;
  var t = String(message.text).trim();
  var command = t.split(/\s+/)[0].toLowerCase();
  var start=t.match(/^\/start(?:@payamejadvalbot)?(?:\s+p_([A-Za-z0-9_-]{4,61}))?$/i);
  if (start) {
    if (start[1]) {
      var chosen=pjFindPuzzle_(start[1]);
      if (chosen) pjSendPuzzle_(chat.id,chosen);
      else pjSendMessage_(chat.id,'این جدول در آرشیو فعال پیدا نشد. از منوی بازی، جدول موجود را انتخاب کن.');
    } else {
      pjSendMessage_(chat.id, '🧩 به پیام جدول خوش آمدی! ⚡ روزانه ۵×۵ و 🧩 روزانه ۷×۷؛ جمعه‌ها چالش ۹×۹. فقط جدول‌های بازبینی‌شده منتشر می‌شوند.');
    }
  } else if (/^\/menu(@payamejadvalbot)?$/.test(command)) {
    pjSendMessage_(chat.id,'🧩 از منوی پایین یک بازی انتخاب کن.');
  } else if (t==='⚡ جدول سریع' || /^\/quick(@payamejadvalbot)?$/.test(command)) {
    pjPuzzle_(chat.id,'quick');
  } else if (t==='🧩 جدول اصلی' || t==='🧩 جدول امروز' ||
             /^\/(jadval|today)(@payamejadvalbot)?$/.test(command)) {
    pjPuzzle_(chat.id,'main');
  } else if (t==='🏆 چالش جمعه' || /^\/friday(@payamejadvalbot)?$/.test(command)) {
    pjPuzzle_(chat.id,'friday');
  } else if (t==='📚 آرشیو جدول‌ها') {
    pjSendMessage_(chat.id,'📚 آرشیو و بازی‌های منتشرشده:\nhttps://nimania.github.io/payamejadval/\n\nبرای بازی داخل همین چت، از لینک اختصاصی هر جدول استفاده کن.');
  } else if (t==='🏅 امتیازهای من' || t==='🏆 امتیازهای من' ||
             /^\/scores(@payamejadvalbot)?$/.test(command)) {
    pjSendMessage_(chat.id,'🏅 امتیاز فعلی در ویجت فقط روی دستگاه محاسبه می‌شود و غیررسمی است. رتبه‌بندی مرکزی و رقابت هفتگی هنوز فعال نشده‌اند.');
  } else if (t==='📤 اشتراک‌گذاری' || t==='👥 دعوت دوستان' ||
             /^\/invite(@payamejadvalbot)?$/.test(command)) {
    pjShare_(chat.id);
  } else if (t==='🎲 یک جدول متفاوت' || /^\/new(@payamejadvalbot)?$/.test(command)) {
    pjPuzzle_(chat.id,'different');
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
    {command:'friday',description:'چالش جمعه ۹×۹'},
    {command:'invite',description:'اشتراک جدول'},
    {command:'new',description:'جدول متفاوت'},
    {command:'scores',description:'امتیازهای من'}
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
          if (date && Date.now()/1000 - date < PJ.maxAgeSeconds) pjHandle_(u.message);
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
