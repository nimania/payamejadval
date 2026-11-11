"use strict";
// Private Telegram crossword webhook. No channel posts and no scheduled sends.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");

const TOKEN = process.env.TELEGRAM_CROSSWORD_BOT_TOKEN || "";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const BOT_USERNAME = "PayameJadvalBot";
const WORD_GAME_URL = "https://nimania.github.io/payamejadval/kalamechin-pro.html";
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "telegram", "catalog.json");

function safeEquals(received, expected) {
  const a = Buffer.from(String(received || ""), "utf8");
  const b = Buffer.from(String(expected || ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function telegram(method, payload) {
  const response = await fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  });
  const json = await response.json();
  if (!response.ok || json.ok !== true) {
    throw new Error("Telegram " + method + ": " + String(json.description || response.status).replaceAll(TOKEN, "[redacted]"));
  }
  return json.result;
}

function catalog() {
  const source = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  if (source.schema !== 1 || !Array.isArray(source.puzzles)) throw Error("Invalid puzzle catalog");
  const list = source.puzzles.filter(p => {
    if (!p || typeof p.id !== "string" || !/^[a-z0-9-]{4,64}$/.test(p.id)) return false;
    if (p.kind !== "crossword" || p.size !== 7) return false;
    if (!(p.editorApproved === true && p.status === "approved") &&
        !(p.status === "private-trial" && p.allowPrivateTrial === true)) return false;
    return /^telegram\/[a-zA-Z0-9-]+\.html$/.test(p.path);
  });
  return list;
}

function readWidget(puzzle) {
  // Allowlisted paths only, no user-supplied filesystem access.
  const filepath = path.resolve(ROOT, puzzle.path);
  if (!filepath.startsWith(path.join(ROOT, "telegram") + path.sep)) throw Error("Invalid widget location");
  const html = fs.readFileSync(filepath, "utf8");
  const raw = Buffer.byteLength(html, "utf8");
  const compressed = zlib.deflateSync(Buffer.from(html, "utf8"), {level:9}).length;
  if (!raw || raw > 32768 || compressed > 4096) throw Error("Widget over Bot API limits");
  return html;
}

const menuMarkup = {
  keyboard: [
    [{text:"🧩 جدول امروز"}, {text:"🎲 یک جدول متفاوت"}],
    [{text:"🔤 کلمه‌چین",web_app:{url:WORD_GAME_URL}}],
    [{text:"🏆 امتیازهای من"}, {text:"👥 دعوت دوستان"}]
  ],
  resize_keyboard:true,
  is_persistent:true
};

async function menu(chatId) {
  await telegram("sendMessage", {
    chat_id:chatId,
    text:"🧩 به پیام جدول خوش آمدی!\nبا دکمه‌های زیر جدول را داخل همین گفت‌وگو حل کن.",
    reply_markup:menuMarkup
  });
}

function dayIndex(count) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Tehran", year:"numeric", month:"2-digit", day:"2-digit"
  }).format(new Date());
  const key = date.replace(/\D/g, "");
  return Number(key) % count;
}

async function action(chatId, kind) {
  if (kind === "invite") {
    const link = "https://t.me/" + BOT_USERNAME;
    return telegram("sendMessage", {
      chat_id:chatId,
      text:"برای دعوت دوستت این لینک را بفرست:\n" + link +
        "\n\nدوستت بعد از Start روی «جدول امروز» می‌زند. ویجت در گفت‌وگوی خصوصی خودش ساخته می‌شود.",
      reply_markup:{inline_keyboard:[
        [{text:"📤 اشتراک‌گذاری لینک ربات",
          url:"https://t.me/share/url?url=" + encodeURIComponent(link) +
            "&text=" + encodeURIComponent("🧩 بیا جدول پیام جدول را حل کنیم!")}],
        [{text:"بازگشت به منو",callback_data:"pj:menu"}]
      ]}
    });
  }
  if (kind === "word") {
    return telegram("sendMessage",{
      chat_id:chatId,
      text:"🔤 کلمه‌چین: بازی اتصال حروف فارسی در ۵۰ مرحله. پیشرفت در همین دستگاه ذخیره می‌شود.",
      reply_markup:{inline_keyboard:[[{text:"🎮 شروع کلمه‌چین",web_app:{url:WORD_GAME_URL}}]]}
    });
  }
  if (kind === "scores") {
    return telegram("sendMessage", {
      chat_id:chatId,
      text:"🏆 هنوز رتبه‌بندی و امتیاز مرکزی فعال نشده است.\n" +
       "در نسخهٔ آزمایشی، حروف و تعداد راهنمایی فقط در حافظهٔ همان پیام در دستگاه خودت ذخیره می‌شوند. " +
       "نتایج قدیمی قابل بازیابی به عنوان امتیاز رسمی نیستند.",
      reply_markup:menuMarkup
    });
  }
  if (kind === "menu") return menu(chatId);
  const available = catalog();
  if (!available.length) {
    return telegram("sendMessage",{chat_id:chatId,text:"هنوز جدول معتبر برای این آزمایش آماده نیست."});
  }
  if (kind === "different" && available.length < 2) {
    return telegram("sendMessage", {
      chat_id:chatId,
      text:"فعلاً فقط یک جدول ۷×۷ آزمایشی داریم. برای «جدول متفاوت» باید جدول‌های تازه در پروژهٔ jadval ساخته، بررسی و به فهرست بازی اضافه شوند.",
      reply_markup:menuMarkup
    });
  }
  const chosen = available[(dayIndex(available.length) + (kind === "different" ? 1 : 0)) % available.length];
  return telegram("sendWidget", {
    chat_id:chatId,
    html:readWidget(chosen),
    caption:"🧩 " + chosen.title + (chosen.status === "private-trial" ? "\nنسخهٔ آزمایشی دوستانه" : ""),
    allow_queries:false,
    is_shared:false,
    reply_markup:menuMarkup
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ok:false});
  if (!TOKEN || !SECRET) return res.status(503).json({ok:false});
  if (!safeEquals(req.headers["x-telegram-bot-api-secret-token"], SECRET)) {
    return res.status(403).json({ok:false});
  }
  let update=req.body;
  if (typeof update === "string") {
    try {update=JSON.parse(update)} catch (_) {return res.status(400).json({ok:false})}
  }
  try {
    if (update && update.callback_query) {
      const q=update.callback_query;
      const chat=q.message?.chat;
      if (!chat || chat.type !== "private" || q.from?.id !== chat.id) return res.status(200).json({ok:true});
      const map={"pj:today":"today","pj:different":"different","pj:scores":"scores",
        "pj:invite":"invite","pj:menu":"menu","pj:word":"word"};
      const kind=map[q.data];
      await telegram("answerCallbackQuery",{callback_query_id:q.id});
      if (kind) await action(chat.id,kind);
    } else if (update && update.message) {
      const m=update.message;
      if (m.chat?.type !== "private" || m.from?.id !== m.chat.id) return res.status(200).json({ok:true});
      const command=String(m.text||"").trim().split(/\s+/)[0].toLowerCase();
      if (command === "/start" || command === "/start@payamejadvalbot" ||
          command === "/menu" || command === "/menu@payamejadvalbot") {
        await menu(m.chat.id);
      } else if (command === "/jadval" || command === "/today") {
        await action(m.chat.id,"today");
      } else if (command === "/new") {
        await action(m.chat.id,"different");
      } else if (command === "/kalamechin" || command === "/word" || m.text === "🔤 کلمه‌چین") {
        await action(m.chat.id,"word");
      } else if (command === "/scores" || m.text === "🏆 امتیازهای من") {
        await action(m.chat.id,"scores");
      } else if (m.text === "🧩 جدول امروز") {
        await action(m.chat.id,"today");
      } else if (m.text === "🎲 یک جدول متفاوت") {
        await action(m.chat.id,"different");
      } else if (m.text === "👥 دعوت دوستان") {
        await action(m.chat.id,"invite");
      }
    }
    return res.status(200).json({ok:true});
  } catch (error) {
    console.error("Crossword bot request failed:", String(error.message||error).replaceAll(TOKEN,"[redacted]"));
    return res.status(502).json({ok:false});
  }
};
