# جدول ۷×۷ تلگرام — آزمایش خصوصی با دوستان

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
