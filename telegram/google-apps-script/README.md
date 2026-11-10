# راه‌اندازی پیام جدول با حساب گوگل — بدون Vercel و بدون شمارهٔ خارجی

این نسخه برای آزمایش خصوصی `@PayameJadvalBot` است. از **Google Apps Script Time-Driven Trigger** استفاده می‌کند، نه Web App/وب‌هوک؛ بنابراین از مشکل redirect سرویس Google Apps Script نیز عبور می‌کند. پاسخ‌ها در اجرای زمان‌بندی‌شده (معمولاً حدود یک دقیقه، بدون تضمین زمان دقیق) می‌رسند. هیچ سروری روی کامپیوتر لازم نیست.

فایل آمادهٔ کپی: [Code.gs](Code.gs)

## راه‌اندازی شخصی

1. با حساب فعلی Google خودت وارد https://script.google.com/home/projects/create شو. یک پروژه با نام `Payame Jadval Telegram` بساز.
2. محتوای `Code.gs` پیش‌فرض (مثل `function myFunction()`) را حذف کن و **تمام محتوای فایل** [Code.gs](Code.gs) این پوشه را در آن قرار بده. Save بزن.
3. در نوار چپ **Project Settings (چرخ‌دنده) → Script Properties → Add script property**، این مقدار را ذخیره کن:
   - Property: `TELEGRAM_CROSSWORD_BOT_TOKEN`
   - Value: **توکن اختصاصی @PayameJadvalBot از BotFather**؛ هرگز در چت یا GitHub عمومی قرار نده.
4. بالای ویرایشگر، از فهرست توابع `setupBot` را انتخاب و **Run** کن. مجوز دسترسی به درخواست‌های خارجی و مدیریت time-driven trigger را برای پروژهٔ *خودت* بررسی و تأیید کن. `setupBot` هویت ربات را با `getMe` کنترل و وجود وب‌هوک را بررسی می‌کند، سپس فقط **یک trigger هر یک دقیقه** می‌سازد. همچنین پیام‌های قدیمیِ صف را کنار می‌گذارد تا پاسخ ناخواسته برای تست‌های قدیمی نفرستد.
5. در تلگرام به https://t.me/PayameJadvalBot برو و **دوباره** `/start` بفرست. اگر پاسخ را در نوبت بعد نگرفتی، تابع `testNow` را در Apps Script به‌طور دستی Run کن و بخش **Executions** را نگاه کن. پس از پیام شروع، چهار دکمهٔ اصلی ظاهر می‌شوند.
6. روی «🧩 جدول امروز» بزن. فایل `telegram/widget-7x7.html` از مخزن عمومی `nimania/payamejadval` بارگذاری می‌شود و `sendWidget` آن را داخل پیام خصوصی تلگرام اجرا می‌کند. دوستان نیز فقط لازم است لینک ربات را دریافت کنند و Start بزنند.

### جلوگیری از تداخل و خطا

- زمان‌بندی قدیمی GitHub `.github/workflows/telegram-menu-bridge.yml` در انتقال به Apps Script **حذف شده** تا دو مصرف‌کنندهٔ `getUpdates` با هم رقابت نکنند. گزینهٔ **Run workflow** دستی به‌عنوان تشخیص اضطراری باقی است، اما پس از راه‌اندازی Apps Script آن را اجرا نکن.
- اگر `setupBot` خطای `Existing Telegram webhook detected` بدهد، آن را بی‌بررسی حذف نکن. ابتدا وب‌هوک قبلی و مالک آن را بررسی کن.
- Google Apps Script برای همهٔ کاربران «شمارهٔ خارجی لازم ندارد» را نمی‌توان تضمین کرد؛ اگر خود حساب گوگلت درخواست احراز هویت داشته باشد، هیچ برنامه‌ای آن را دور نمی‌زند. اما **اتصال GitHub به Vercel و تأیید شمارهٔ تلفن در Vercel اینجا وجود ندارد**.
- پاسخ‌ها به زمان اجرای trigger و سهمیهٔ Apps Script وابسته‌اند. سهمیهٔ معمول حساب شخصی گوگل برای trigger runtime روزانه ۹۰ دقیقه است و برای URL Fetch حدود ۲۰هزار درخواست. این نسخه برای آزمایش محدود دوستانه مناسب است؛ نه برای حجم زیاد کاربران.
- هیچ نتیجه یا امتیاز در پایگاه داده ثبت نمی‌شود؛ فقط پاسخ‌های محلی در ویجت حفظ می‌شوند.
- فعلاً فقط یک جدول آزمایشی در `telegram/catalog.json` وجود دارد. با فهرست دو یا چند جدول، «جدول متفاوت» فعال می‌شود. افزودن جدول نهایی همچنان به کنترل `nimania/jadval` و تأیید ویراستاری نیاز دارد.
- برای توقف می‌توان `stopBot` را اجرا کرد؛ trigger را حذف می‌کند و روی ربات‌های «نشانی» یا کانال‌ها اثری ندارد.

مستندات رسمی:
- https://developers.google.com/apps-script/guides/triggers/installable
- https://developers.google.com/apps-script/reference/script/clock-trigger-builder
- https://developers.google.com/apps-script/guides/properties
- https://core.telegram.org/bots/api#getupdates
- https://core.telegram.org/bots/api#sendwidget
