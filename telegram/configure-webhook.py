#!/usr/bin/env python3
"""Configure an opt-in Telegram bot webhook without logging credentials."""
import json
import os
import re
import sys
import urllib.error
import urllib.request

token = os.environ.get("TELEGRAM_CROSSWORD_BOT_TOKEN", "")
secret = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
url = os.environ.get("TELEGRAM_CROSSWORD_WEBHOOK_URL", "")
if not token or not secret or not url.startswith("https://"):
    sys.exit("Missing bot token, webhook secret, or HTTPS webhook URL")
if not re.fullmatch(r"[A-Za-z0-9_-]{1,256}", secret):
    sys.exit("Webhook secret must only contain alphanumerics, hyphens and underscores")
req = urllib.request.Request(
    "https://api.telegram.org/bot" + token + "/setWebhook",
    data=json.dumps({"url": url, "secret_token": secret, "allowed_updates": ["message"]}).encode(),
    headers={"Content-Type": "application/json"}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=20) as response:
        result = json.load(response)
except urllib.error.HTTPError as exc:
    try:
        result = json.load(exc)
    except Exception:
        sys.exit("Telegram rejected webhook configuration")
except urllib.error.URLError:
    sys.exit("Unable to reach Telegram Bot API")
if not result.get("ok"):
    sys.exit("Webhook configuration failed: " + result.get("description", "unknown Telegram error"))
print("Telegram webhook configured successfully.")
