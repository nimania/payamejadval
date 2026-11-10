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
  cacheSeconds: 900,
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
      [{text: '🧩 جدول امروز'}, {text: '🎲 یک جدول متفاوت'}],
      [{text: '🏆 امتیازهای من'}, {text: '👥 دعوت دوستان'}]
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
  var cached = cache.get('pj-catalog-v1');
  if (cached) return JSON.parse(cached);
  var res = UrlFetchApp.fetch(PJ.repoBase + 'catalog.json', {muteHttpExceptions: true});
  if (res.getResponseCode() !== 200) throw new Error('Crossword catalogue unavailable');
  var data = JSON.parse(res.getContentText('UTF-8'));
  if (data.schema !== 1 || !Array.isArray(data.puzzles)) throw new Error('Invalid crossword catalogue');
  var puzzles = data.puzzles.filter(function(p) {
    return p && p.kind === 'crossword' && p.size === 7
      && /^[a-z0-9-]{4,64}$/.test(p.id)
      && /^telegram\/[A-Za-z0-9-]+\.html$/.test(p.path)
      && ((p.status === 'approved' && p.editorApproved === true)
       || (p.status === 'private-trial' && p.allowPrivateTrial === true));
  });
  cache.put('pj-catalog-v1', JSON.stringify(puzzles), PJ.cacheSeconds);
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

function pjPuzzle_(chatId, different) {
  var puzzles = pjCatalogue_();
  if (!puzzles.length) {
    pjSendMessage_(chatId, 'هنوز جدول مجاز و بررسی‌شده‌ای برای بازی آماده نشده است.');
    return;
  }
  if (different && puzzles.length < 2) {
    pjSendMessage_(chatId, 'فعلاً فقط یک جدول ۷×۷ آزمایشی آماده است. وقتی جدول دوم بررسی و اضافه شود، دکمهٔ «جدول متفاوت» فعال خواهد شد.');
    return;
  }
  var index = (pjTehranDay_() % puzzles.length + (different ? 1 : 0)) % puzzles.length;
  var selected = puzzles[index];
  pjApi_('sendWidget', {
    chat_id: chatId,
    html: pjWidgetHtml_(selected),
    caption: '🧩 ' + selected.title + (selected.status === 'private-trial' ? '\nنسخهٔ آزمایشی دوستانه' : ''),
    allow_queries: false,
    is_shared: false
  });
}

function pjHandle_(message) {
  var chat = message && message.chat;
  var sender = message && message.from;
  if (!chat || chat.type !== 'private' || !sender || sender.id !== chat.id) return;
  if (!message.text) return;
  var t = String(message.text).trim();
  var command = t.split(/\s+/)[0].toLowerCase();
  if (/^\/(start|menu)(@payamejadvalbot)?$/.test(command)) {
    pjSendMessage_(chat.id, '🧩 به پیام جدول خوش آمدی!\nبرای شروع یکی از دکمه‌های پایین را لمس کن.');
  } else if (/^\/(jadval|today)(@payamejadvalbot)?$/.test(command) || t === '🧩 جدول امروز') {
    pjPuzzle_(chat.id, false);
  } else if (/^\/new(@payamejadvalbot)?$/.test(command) || t === '🎲 یک جدول متفاوت') {
    pjPuzzle_(chat.id, true);
  } else if (/^\/scores(@payamejadvalbot)?$/.test(command) || t === '🏆 امتیازهای من') {
    pjSendMessage_(chat.id, '🏆 فعلاً امتیاز رسمی و رتبه‌بندی مرکزی فعال نشده است.\nپیشرفت جدول فقط روی دستگاه خودت می‌ماند.');
  } else if (t === '👥 دعوت دوستان' || /^\/invite(@payamejadvalbot)?$/.test(command)) {
    pjSendMessage_(chat.id, '👥 این لینک را برای دوستانت بفرست:\nhttps://t.me/PayameJadvalBot\nبعد از Start، هر نفر جدول را در چت خودش دریافت می‌کند.');
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
    {command:'jadval',description:'جدول امروز'},
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
