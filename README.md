# WAIMA

**من کیستم؟** · **ترسیم‌گر ذهنی**

پلتفرم یادگیری هوشمند: گفتگو، نقشه ذهنی، بازی و پیشرفت شخصی.

---

## امکانات

- گفتگوی هوشمند چندزبانه (فارسی / English / العربية)
- نقشه ذهنی یکپارچه از دانش کاربر
- بازی روزانه: کوئیز، ارتباط مفاهیم، درست/نادرست
- XP، سطح، جدول امتیازات، پروفایل و گردونه شانس
- ورود با **آیدی** (بدون ایمیل نمایشی)
- پوسته‌های ظاهری و ذخیره ابری با Supabase

---

## اجرا محلی

```bash
cp .env.example .env.local
# مقادیر را پر کن
npm install
npm run dev
```

باز کن: [http://localhost:3000](http://localhost:3000)

---

## متغیرهای محیطی

| متغیر | توضیح |
|--------|--------|
| `OPENAI_API_KEY` | کلید API سازگار با OpenAI |
| `OPENAI_BASE_URL` | آدرس پایه (مثلاً GapGPT) |
| `NEXT_PUBLIC_SUPABASE_URL` | آدرس پروژه Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | کلید anon |

---

## دیتابیس

فایل `supabase/schema.sql` را در SQL Editor سوپابیس اجرا کن.

در Authentication → Providers → Email گزینه **Confirm email** را خاموش کن (ورود با آیدی).

---

## اسکریپت‌ها

```bash
npm run dev        # توسعه
npm run build      # بیلد تولید
npm run start      # اجرای بیلد
npm run typecheck  # بررسی TypeScript
npm run lint       # ESLint
```

---

## ساختار

```
src/app/           صفحات و API
src/components/    کامپوننت‌های UI
src/lib/           منطق، i18n، sync، gamification
supabase/          اسکیمای دیتابیس
```

---

## استقرار

ریپو را به Vercel وصل کن و همان متغیرهای `.env` را در Environment Variables بگذار.

---

نسخه: `0.9.0-beta` · پروژه در حال توسعه فعال است.
