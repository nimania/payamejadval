"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");

const TOKEN = process.env.TELEGRAM_CROSSWORD_BOT_TOKEN || "";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const INVITE_CODE = process.env.TELEGRAM_CROSSWORD_INVITE_CODE || "";
const HTML_FILE = path.join(process.cwd(), "telegram", "widget-7x7.html");

function equalConstantTime(a, b) {
  const aa = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

async function telegram(method, payload) {
  const response = await fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  });
  const json = await response.json();
  if (!response.ok || !json.ok) {
    throw new Error("Telegram " + method + " failed: " + (json.description || response.status));
  }
  return json.result;
}

function readWidget() {
  const html = fs.readFileSync(HTML_FILE, "utf8");
  const raw = Buffer.byteLength(html, "utf8");
  const zipped = zlib.deflateSync(Buffer.from(html, "utf8"), { level: 9 }).length;
  if (!raw || raw > 32768 || zipped > 4096) {
    throw new Error("Telegram widget exceeds size limit");
  }
  return html;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!TOKEN || !SECRET || !INVITE_CODE) return res.status(503).json({ ok: false });
  if (!equalConstantTime(req.headers["x-telegram-bot-api-secret-token"], SECRET)) {
    return res.status(403).json({ ok: false });
  }
  let update = req.body;
  if (typeof update === "string") {
    try { update = JSON.parse(update); }
    catch { return res.status(400).json({ ok: false }); }
  }
  const message = update && update.message;
  if (!message || message.chat?.type !== "private") return res.status(200).json({ ok: true });
  const match = /^\/start(?:@[A-Za-z0-9_]+)?(?:\s+([A-Za-z0-9_-]{1,64}))?\s*$/.exec(message.text || "");
  if (!match) return res.status(200).json({ ok: true });

  try {
    if (match[1] !== INVITE_CODE) {
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        text: "این ربات فعلاً برای آزمایش خصوصی جدول است. از برگزارکننده لینک دعوت اختصاصی را بگیرید."
      });
    } else {
      await telegram("sendWidget", {
        chat_id: message.chat.id,
        html: readWidget(),
        caption: "🧩 پیام جدول | جدول آزمایشی ۷×۷ — همین‌جا حلش کن!",
        allow_queries: false
      });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram crossword delivery failed:", error.message.replaceAll(TOKEN, "[redacted]"));
    return res.status(502).json({ ok: false });
  }
};
