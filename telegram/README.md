# جدول ۷×۷ تلگرام — آزمایش خصوصی با دوستان

## آزمایش سریع با ربات اختصاصی @PayameJadvalBot (بدون هاست)

ربات ایجاد شده است ولی **توکن هنوز در GitHub ثبت نشده و ارسال واقعی تأیید نشده است**. برای اولین ارسال با امکانات حاضر:

1. در [Repository Actions secrets](https://github.com/nimania/payamejadval/settings/secrets/actions) یک Secret با نام `TELEGRAM_CROSSWORD_BOT_TOKEN` بسازید و **توکن BotFather ربات جدید** را همان‌جا وارد کنید؛ توکن را در چت یا فایل GitHub قرار ندهید.
2. در چت خصوصی [@PayameJadvalBot](https://t.me/PayameJadvalBot) اول Start و سپس دستور `/jadval JADVAL2026` را بفرستید.
3. [گردش‌کار «Send 7x7 crossword privately via PayameJadvalBot»](https://github.com/nimania/payamejadval/actions/workflows/send-telegram-crossword-test.yml) را با `test_code=JADVAL2026` و `confirm_send=true` اجرا کنید.
4. گردش‌کار با `getMe` مطمئن می‌شود توکن متعلق به همین ربات است، با `getUpdates` فقط دستور همین چت را شناسایی می‌کند و ویجت را با `sendWidget` در گفت‌وگوی خصوصی می‌فرستد. هیچ کانال یا گروهی دریافت‌کننده نیست.

قیدهای ایمنی: دستور باید حداکثر ۳۰ دقیقه پیش ارسال شده باشد، تنها یک چت منطبق وجود داشته باشد، و ربات وب‌هوک فعال دیگری نداشته باشد. گردش‌کار هیچ وب‌هوک فعالی را حذف یا تغییر نمی‌دهد. اگر ربات قبلاً وب‌هوک داشته باشد، باید از همان دریافت‌کنندهٔ پیام برای بازی استفاده شود.

این گردش‌کار **آزمایش دستی یک‌باره** است؛ برای پاسخ‌دهی خودکار فوری به /start، لازم است مسیر وب‌هوک سرورلس پایین نیز استقرار و تنظیم شود.

---


این پوشه حاوی ویجت داخل پیام و کد وب‌هوک است. انتشار در کانال عمومی انجام نمی‌شود.

## راه‌اندازی گام‌به‌گام

۱. در [BotFather](https://t.me/BotFather) یک ربات مستقل برای «پیام جدول» ایجاد کنید. توکن BotFather را در فایل عمومی یا چت نفرستید.

۲. مخزن nimania/payamejadval را به یک پروژهٔ Vercel جدید متصل کنید (جدا از سایت اصلی پیام جدول). مسیر API عبارت است از /api/telegram-crossword. فایل vercel.json تضمین می‌کند فایل HTML ویجت هم کنار تابع API بسته‌بندی شود.

۳. سه متغیر محیطی در پروژهٔ Vercel برای Production ثبت کنید:
- TELEGRAM_CROSSWORD_BOT_TOKEN = توکن BotFather
- TELEGRAM_WEBHOOK_SECRET = یک رشتهٔ تصادفی بلند دارای حروف، ارقام، خط تیره یا زیرخط
- TELEGRAM_CROSSWORD_INVITE_CODE = یک کد دعوت طولانی تصادفی؛ مثل یک رشتهٔ ۱۶ نویسه‌ای

۴. در [GitHub Actions Secrets](https://github.com/nimania/payamejadval/settings/secrets/actions) نیز سه مقدار زیر را اضافه کنید:
- TELEGRAM_CROSSWORD_BOT_TOKEN = همان توکن
- TELEGRAM_WEBHOOK_SECRET = همان secret
- TELEGRAM_CROSSWORD_WEBHOOK_URL = نشانی کامل API، مثلا https://YOUR-DEPLOYMENT.vercel.app/api/telegram-crossword

۵. گردش‌کار [Configure private Telegram crossword webhook](https://github.com/nimania/payamejadval/actions/workflows/configure-telegram-crossword.yml) را اجرا کنید تا Telegram setWebhook تنظیم شود.

۶. لینک خصوصی https://t.me/YOUR_BOT_USERNAME?start=YOUR_INVITE_CODE را به دوستان بفرستید. هر شخص با زدن Start یک جدول تعاملی اختصاصی داخل چت خودش دریافت می‌کند.

## وضعیت و محدوده

- فایل HTML ویجت: telegram/widget-7x7.html
- تابع سرورلس: api/telegram-crossword.js
- هر دوست فقط با واردکردن لینک دعوت و لمس Start جدول دریافت می‌کند. ربات بدون اقدام کاربر ابتدا پیام نمی‌دهد.
- در محیط عملیاتی تلگرام، پیام ویجت قابلیت فوروارد ندارد؛ فقط لینک بات قابل‌اشتراک‌گذاری است.
- یک جدول ۷×۷ ثابت فعلاً برای آزمایش است، نه سرویس جدول روزانه.
- پیشرفت بازی به‌صورت localStorage در همان پیام و دستگاه ذخیره می‌شود و به سرور ارسال نمی‌شود.
- کد دعوتِ اشتراکی مانع ورود افراد دارای لینک نیست؛ برای فهرست محدود به دوستان مشخص باید allowlist یا دعوت یک‌بارمصرف اضافه شود.
- تا زمانی که ربات، متغیرهای محیطی، هاست Vercel و وب‌هوک فعال نشده‌اند، ارسال زندهٔ تلگرام انجام نشده است.

مراجع: https://core.telegram.org/bots/widgets و https://core.telegram.org/bots/api#sendwidget
