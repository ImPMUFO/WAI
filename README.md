# WAIMA

**من کیستم؟**  
**ترسیم‌گر ذهنی**

پلتفرم زندهٔ یادگیری و خودشناسی:  
با گفتگو دانش را می‌سنجیم، نقشهٔ ذهن را می‌سازیم و با بازی و پیشرفت مسیر رشد را روشن می‌کنیم.

🌐 سایت: [https://waima.vercel.app](https://waima.vercel.app)  
🤖 ربات تلگرام: [@WAIMATGbot](https://t.me/WAIMATGbot)

---

## WAIMA چیست؟

WAIMA فقط یک چت‌بات نیست.

اینجا کاربر می‌فهمد:

- چه چیزهایی را واقعاً بلد است  
- کجا دانشش سطحی یا ناقص است  
- قدم بعدی یادگیری‌اش چیست  
- مسیر رشدش در طول زمان چطور پیش رفته  

همه‌چیز در یک تجربه جمع شده است:  
گفتگو · نقشه ذهنی · بازی · سطح و امتیاز · پوستهٔ ظاهری · گفتگوی جهانی · ربات تلگرام

---

## امکانات

### گفتگو با WAIMA
همراه یادگیری با لحن خودمونی و منطقی  
پاسخ مرتبط با موضوع  
گاهی معرفی کتاب مرتبط با مسیر یادگیری  

### نقشه ذهنی
نمایش دانش به‌صورت زنده  
گره‌های آشنا، نزدیک و دور  
به‌روزرسانی پس از گفتگو  
خروجی تصویری و PDF  

### بازی‌ها
کوئیز و بازی‌های آموزشی  
XP و سطح  
جدول امتیازات  

### حساب کاربری
ثبت‌نام با **آیدی** (حروف کوچک انگلیسی، عدد و خط زیر)  
پروفایل، آواتار، بیوگرافی  
همگام‌سازی با Supabase  

### گفتگوی جهانی
فضای متنی بین کاربران  
استیکرهای پیش‌فرض سایت  
ویرایش و حذف پیام خود  

### پوسته‌های ظاهری
اصلی · روز · دریایی · آتشین · کهکشانی · چوبی  

اشیای متحرک تزئینی فقط در صفحهٔ اول فعال‌اند.

### ربات تلگرام
[@WAIMATGbot](https://t.me/WAIMATGbot)  
گفتگوی متنی با همان هوش مصنوعی سایت  
دستورها: `/start` · `/site` · `/help`  

### چندزبانه
🇮🇷 فارسی · 🇺🇸 English · 🇸🇦 العربية  

---

## هوش مصنوعی

اولویت پاسخ‌دهی:

1. **Google Gemini** (اصلی)  
2. **Groq** (پشتیبان — در صورت خطا یا سقف Gemini)

مدل پیشنهادی Gemini: `gemini-3.6-flash`  
مدل پیشنهادی Groq: `openai/gpt-oss-120b`

---

## اجرا محلی

```bash
git clone https://github.com/ImPMUFO/WAI.git
cd WAI
cp .env.example .env.local
npm install
npm run dev
```

باز کن: [http://localhost:3000](http://localhost:3000)

---

## متغیرهای محیطی (Vercel)

| متغیر | نقش |
|--------|------|
| `GEMINI_API_KEY` | کلید Google Gemini (اصلی) |
| `GEMINI_MODEL` | پیش‌فرض: `gemini-3.6-flash` |
| `GROQ_API_KEY` | کلید Groq (پشتیبان — اختیاری) |
| `GROQ_MODEL` | پیش‌فرض: `openai/gpt-oss-120b` |
| `NEXT_PUBLIC_SUPABASE_URL` | آدرس پروژه Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | کلید anon عمومی |
| `NEXT_PUBLIC_APP_URL` | آدرس سایت (مثلاً `https://waima.vercel.app`) |
| `TELEGRAM_BOT_TOKEN` | توکن ربات از @BotFather |

---

## ربات تلگرام

1. با @BotFather ربات بساز و توکن را در `TELEGRAM_BOT_TOKEN` بگذار  
2. Deploy کن  
3. یک‌بار این آدرس را در مرورگر باز کن:

```text
https://waima.vercel.app/api/telegram?setup=1
```

4. در تلگرام به ربات پیام بده  

تست AI:

```text
https://waima.vercel.app/api/telegram?test=1&q=سلام
```

---

## دیتابیس (Supabase)

1. پروژه در Supabase بساز  
2. اسکیمای `supabase/schema.sql` را در SQL Editor اجرا کن  
3. URL و anon key را در متغیرهای محیطی بگذار  

ورود کاربران بر پایهٔ آیدی است.

---

## اسکریپت‌ها

```bash
npm run dev        # توسعه
npm run build      # بیلد تولید
npm run start      # اجرای بیلد
npm run typecheck  # TypeScript
npm run lint       # ESLint
```

---

## ساختار پروژه

```text
src/app/              صفحات و APIها
src/components/       رابط کاربری و تم‌ها
src/lib/              منطق، i18n، AI، گیمیفیکیشن
src/content/          محتوای قابل ویرایش
supabase/             اسکیمای پایگاه داده
```

---

## استقرار

ریپو را به Vercel وصل کن و متغیرهای محیطی را تنظیم کن.  
بعد از هر Push روی شاخهٔ اصلی، نسخهٔ جدید Deploy می‌شود.

---

## سئو

- `sitemap.xml` و `robots.txt` فعال‌اند  
- سایت را در Google Search Console با آدرس **https** ثبت کن  
- نقشهٔ سایت: `sitemap.xml`  

---

## هویت برند

**WAIMA**  
من کیستم؟  
ترسیم‌گر ذهنی  

محیطی زنده برای شناخت دانش خود، یادگیری هدفمند و پیشرفت قابل مشاهده.

---

## نسخه

**0.9.0-beta** — در حال توسعهٔ فعال  

ساخته‌شده با Next.js · React · Supabase · Gemini · Groq  
