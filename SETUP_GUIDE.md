# 🚀 راهنمای شروع سریع
## Knowledge Mapper بر روی Vercel

---

## Step 1️⃣: آماده‌سازی Local

### اگر Git ندارد:
```bash
# Download Git از:
# https://git-scm.com/download

# بعد از نصب، Test کن:
git --version
```

### اگر Node ندارد:
```bash
# Download Node.js از:
# https://nodejs.org/

# بعد از نصب، Test کن:
node --version
npm --version
```

---

## Step 2️⃣: Clone پروژه

```bash
# Terminal/Command Prompt باز کن

# Project folder بساز
mkdir my-projects
cd my-projects

# Repository clone کن
git clone https://github.com/YOUR_USERNAME/knowledge-mapper.git
cd knowledge-mapper
```

---

## Step 3️⃣: Install Dependencies

```bash
# تمام packages نصب کن
npm install

# یا اگر Yarn استفاده می‌کنی:
yarn install
```

**⏳ صبر کن:** ~2-3 دقیقه

---

## Step 4️⃣: Local Test کردن

```bash
# Development server شروع کن
npm run dev
```

**نتیجه:**
```
▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local
```

**✅ چک کن:**
- Browser میں: http://localhost:3000 باز کن
- سایت نشان دادی می‌شود؟
- ✓ = آماده برای Vercel!

---

## Step 5️⃣: GitHub میں اپلود

```bash
# اگر اب تک push نکردی:

git add .
git commit -m "Initial commit: Knowledge Mapper"
git push origin main

# یا اگر main branch نیست:
git branch -M main
git push -u origin main
```

---

## Step 6️⃣: Vercel Deploy

### راه ساده (Recommended):

**1. Vercel میں جاؤ:**
- https://vercel.com
- کلیک: "Sign Up" (یا Sign In)
- GitHub سے login کن

**2. Project Import کن:**
- کلیک: "Add New" → "Project"
- انتخاب کن: GitHub repository
- "knowledge-mapper" انتخاب کن
- کلیک: "Import"

**3. Configure کن:**
- Framework: "Next.js" (خودکار detect ہوگا)
- Root Directory: "./" (default)
- Build Command: "npm run build" (default)
- Output Directory: ".next" (default)
- کلیک: "Deploy"

**4. صبر کن:**
```
Building...
✓ Build completed
✓ Deployment successful
```

**5. URL دیکھو:**
```
🎉 Your site is live at:
https://knowledge-mapper.vercel.app
```

---

## ✅ تمام!

اب پروژه شما زندہ ہے! 🚀

---

## 🔧 اگر مسئلہ آئے

### مسئلہ: Build Failed

**حل:**
```bash
# Local میں دوبارہ بناؤ
npm run build

# اگر errors دیکھو:
npm run lint
```

### مسئلہ: 404 Error

**حل:**
1. Vercel Logs دیکھو
2. Repository structure چیک کرو
3. دوبارہ Deploy کرو

### مسئلہ: Slow Loading

**حل:**
```bash
npm run build
# Check output size
```

---

## 📝 بعدی قدم‌ها

### اگر سایت اچھی کھل گیا:

1. **Domain شامل کرو:**
   - Vercel Settings → Domains
   - اپنا Domain شامل کر

2. **Environment Variables شامل کرو:**
   - Vercel Settings → Environment Variables
   - متغیرے شامل کر

3. **API بنانا شروع کر:**
   - `src/app/api/` folder میں routes بناؤ
   - Database connect کرو (Supabase)

4. **More Pages شامل کرو:**
   - `src/app/dashboard/page.tsx`
   - `src/app/about/page.tsx`
   - وغیرہ

---

## 🎓 مفید Commands

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Type check
npm run lint

# Clean build
rm -rf .next
npm run build
```

---

## 📚 مثالوں برای Pages

### Page شامل کرنا:

```bash
# فائل بناؤ:
src/app/about/page.tsx
```

```tsx
export default function About() {
  return (
    <div className="p-8">
      <h1>درباره‌ی ما</h1>
      <p>محتوا اینجا</p>
    </div>
  )
}
```

**نتیجہ:** http://localhost:3000/about

---

## 🌐 Custom Domain شامل کرنا

1. Domain خریدو (GoDaddy, Namecheap, وغیرہ)
2. Vercel میں جاؤ → Settings → Domains
3. Domain شامل کرو
4. DNS settings تبدیل کرو
5. صبر کن ~30 منٹ

---

## 📞 مزید مدد

اگر مسائل ہوں:

1. Vercel Docs: https://vercel.com/docs
2. Next.js Docs: https://nextjs.org/docs
3. GitHub Issues: https://github.com/YOUR_USERNAME/knowledge-mapper/issues

---

## 🎉 مبارک!

اب آپ کے پاس ایک production-ready پروژہ ہے!

**اگلا:** بہتریاں شامل کریں اور دوستوں کو دکھائیں! 🚀
