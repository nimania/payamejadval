#!/usr/bin/env python3
"""Activate private PayameJadvalBot webhook after secure server deployment."""
import json
import os
import re
import sys
import urllib.error
import urllib.request

TOKEN = os.environ.get("TELEGRAM_CROSSWORD_BOT_TOKEN", "").strip()
SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "").strip()
URL = os.environ.get("TELEGRAM_CROSSWORD_WEBHOOK_URL", "").strip()
if not TOKEN or not SECRET or not URL.startswith("https://"):
    sys.exit("Missing dedicated bot token, webhook secret, or HTTPS endpoint")
if not re.fullmatch(r"[A-Za-z0-9_-]{1,256}", SECRET):
    sys.exit("Invalid Telegram webhook secret")

def telegram(method, body=None):
    req = urllib.request.Request(
        "https://api.telegram.org/bot" + TOKEN + "/" + method,
        data=json.dumps(body or {}).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            answer=json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError) as err:
        sys.exit("Bot API failed on "+method+" ("+type(err).__name__+")")
    if not answer.get("ok"):
        sys.exit("Telegram rejected "+method+": "+str(answer.get("description","unknown")).replace(TOKEN,"[redacted]"))
    return answer["result"]

bot=telegram("getMe")
if bot.get("username","").lower() != "payamejadvalbot":
    sys.exit("Refusing webhook setup: secret belongs to the wrong bot")
telegram("setWebhook", {
    "url": URL,
    "secret_token": SECRET,
    "allowed_updates": ["message","callback_query","widget_query"]
})
telegram("setMyCommands", {"commands": [
    {"command":"start","description":"منوی بازی پیام جدول"},
    {"command":"jadval","description":"دریافت جدول امروز"},
    {"command":"new","description":"جدول متفاوت"},
    {"command":"scores","description":"وضعیت امتیازها"}
]})
print("Private crossword webhook and Telegram command menu configured.")
