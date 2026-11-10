#!/usr/bin/env python3
"""One-time private trial for @PayameJadvalBot (does not configure webhooks).

This script only uses the GitHub Actions secret. It never logs credentials
or chat identifiers, consumes no update offsets, and never posts to channels.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import zlib
from pathlib import Path

TOKEN = os.environ.get("TELEGRAM_CROSSWORD_BOT_TOKEN", "").strip()
CODE = os.environ.get("TELEGRAM_CROSSWORD_TEST_CODE", "").strip()
SEND = os.environ.get("TELEGRAM_CROSSWORD_CONFIRM_SEND", "").lower() == "true"
WIDGET_PATH = Path(__file__).resolve().parent / "widget-7x7.html"

def fail(reason):
    sys.exit(reason)

def api(method, payload=None):
    req = urllib.request.Request(
        "https://api.telegram.org/bot" + TOKEN + "/" + method,
        data=json.dumps(payload or {}).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            answer=json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        fail("Telegram request failed (" + method + ", " + type(exc).__name__ + ")")
    if not answer.get("ok"):
        desc=str(answer.get("description", "Telegram API error"))
        fail("Telegram rejected " + method + ": " + desc.replace(TOKEN, "[redacted]"))
    return answer["result"]

if not TOKEN:
    fail("Missing TELEGRAM_CROSSWORD_BOT_TOKEN in GitHub Actions secrets")
if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", CODE):
    fail("Provide an ASCII test code 8-64 characters long")

me = api("getMe")
if me.get("username", "").lower() != "payamejadvalbot":
    fail("Incorrect bot identity: secret must belong to @PayameJadvalBot")

raw = WIDGET_PATH.read_bytes()
if not raw or len(raw)>32768 or len(zlib.compress(raw,9))>4096:
    fail("HTML widget size exceeds official Telegram limits")
html = raw.decode("utf-8")
print("Validated: expected bot account and Telegram HTML/zlib limits.")
if not SEND:
    print("Dry run completed. No Telegram message was sent.")
    sys.exit(0)

webhook=api("getWebhookInfo")
if webhook.get("url"):
    fail("Existing webhook is active; refusing to interfere with it. Use the webhook deployment instead.")

updates=api("getUpdates", {"limit":100,"timeout":0,"allowed_updates":["message"]})
now=int(time.time())
matching=set()
for update in updates:
    message=update.get("message") or {}
    chat=message.get("chat") or {}
    sender=message.get("from") or {}
    command=str(message.get("text","")).strip()
    if (chat.get("type")=="private"
        and chat.get("id")==sender.get("id")
        and command in {"/jadval "+CODE, "/jadval@PayameJadvalBot "+CODE}
        and 0<=now-int(message.get("date",0))<=1800):
        matching.add(chat["id"])
if len(matching)!=1:
    fail("Expected one private /jadval CODE in the last 30 minutes; found "+str(len(matching)))
chat_id=next(iter(matching))
api("sendWidget", {
    "chat_id":chat_id,
    "html":html,
    "caption":"🧩 جدول ۷×۷ پیام جدول — همین‌جا حلش کن!",
    "allow_queries":False,
    "is_shared":False
})
print("Native crossword widget sent successfully in one private chat.")
