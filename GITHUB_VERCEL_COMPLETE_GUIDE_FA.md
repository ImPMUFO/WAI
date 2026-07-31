# 📚 راهنمای کامل GitHub + Vercel
## Knowledge Mapper - از صفر تا Production

---

## 🎯 مراحل کلی

```
1️⃣ GitHub Account بساز
   ↓
2️⃣ Repository بساز
   ↓
3️⃣ فایل‌های پروژه Upload کن
   ↓
4️⃣ Vercel Account بساز
   ↓
5️⃣ Vercel سے Deploy کن
   ↓
6️⃣ سایت زندہ ہے! 🎉
```

---

# 🔵 Part 1: GitHub Setup

## مرحلہ 1: GitHub Account بنانا

### اگر Account نہیں ہے:

1. **جاؤ:** https://github.com
2. **کلیک:** "Sign up" (بالا دائیں)
3. **پُر کریں:**
   ```
   📧 Email: your@email.com
   🔐 Password: مضبوط رمز
   👤 Username: ali-dev (مثال)
   ```
4. **تصدیق کریں:** Email verify کریں
5. **تمام!** ✅

---

## مرحلہ 2: Repository بنانا

### Repository کیا ہے؟
Project کو store کرنے کی جگہ (Google Drive جیسے)

### بنانے کے لیے:

1. **GitHub میں لاگ ان ہو**
2. **کلیک:** "+" → "New repository"
3. **پُر کریں:**
   ```
   Repository name:    knowledge-mapper
   Description:        AI Knowledge Mapping Platform
   Public:             ✓ (سب دیکھ سکیں)
   Add README:         ✓
   Add .gitignore:     ✓ Node
   Add license:        ✓ MIT
   ```
4. **کلیک:** "Create repository"
5. **تمام!** ✅

---

## مرحلہ 3: فائلیں Upload کرنا

### آپ کے پاس دو طریقے ہیں:

---

## 🟢 طریقہ A: GitHub Desktop (سہل ترین)

### نصب:
```
1. جاؤ: https://desktop.github.com
2. ڈاؤن لوڈ کریں
3. نصب کریں
4. لاگ ان کریں GitHub سے
```

### استعمال:

**Step 1: Repository Clone کریں**
```
1. GitHub Desktop کھولیں
2. File → Clone Repository
3. Select: your-username/knowledge-mapper
4. Local path منتخب کریں
5. Clone کریں
```

**Step 2: فائلیں شامل کریں**
```
1. Folder کھولیں جہاں Clone کیا
2. ZIP سے فائلیں نکالیں
3. یہاں Paste کریں
4. GitHub Desktop میں دیکھیں
```

**Step 3: Commit کریں**
```
1. GitHub Desktop میں
2. Left side: تمام فائلیں دیکھیں ✓
3. نیچے "Summary" میں لکھیں:
   
   "Initial commit: Knowledge Mapper Project"

4. کلیک: "Commit to main"
```

**Step 4: Push کریں**
```
1. بالا میں "Push" بٹن کلیک کریں
2. صبر کریں...
3. تمام! ✅
```

---

## 🟠 طریقہ B: Terminal (Advanced)

### Git نصب کریں:
```bash
# Windows: https://git-scm.com/download/win
# Mac: brew install git
# Linux: sudo apt install git
```

### Terminal میں:

**Step 1: تنظیم کریں**
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

**Step 2: Local Repository**
```bash
# Folder بنائیں
mkdir my-projects
cd my-projects

# Clone کریں
git clone https://github.com/YOUR_USERNAME/knowledge-mapper.git
cd knowledge-mapper
```

**Step 3: فائلیں شامل کریں**
```bash
# ZIP سے فائلیں نکالیں اور یہاں ڈالیں

# اب:
git add .
git commit -m "Initial commit: Knowledge Mapper"
git push origin main
```

---

## ✅ چیک کریں

GitHub میں دیکھیں:
1. https://github.com/YOUR_USERNAME/knowledge-mapper
2. تمام فائلیں نظر آئیں؟ ✅
3. README.md نمایش ہو رہا ہے? ✅

اگر ہاں → اگلے حصے پر جائیں! 🚀

---

# 🔵 Part 2: Vercel Deploy

## مرحلہ 4: Vercel Account بنانا

### اگر Account نہیں ہے:

1. **جاؤ:** https://vercel.com
2. **کلیک:** "Sign Up"
3. **منتخب کریں:** "Continue with GitHub"
4. **منظور کریں:** GitHub Permissions
5. **تمام!** ✅

---

## مرحلہ 5: Project Deploy کرنا

### سب سے آسان طریقہ:

**Step 1: Project Import کریں**
```
1. Vercel Dashboard میں جائیں
2. کلیک: "Add New" → "Project"
3. منتخب کریں: knowledge-mapper (GitHub سے)
```

**Step 2: تنظیم کریں (Default اچھی ہے)**
```
Framework:      Next.js ✓ (خودکار)
Root Directory: ./ ✓
Build:          npm run build ✓
Output:         .next ✓
```

**Step 3: Deploy کریں**
```
کلیک: "Deploy" اور صبر کریں...

🔄 Building...
✅ Deployment Successful!

Your site is live at:
🎉 https://knowledge-mapper.vercel.app
```

---

## ✅ ہو گیا!

اب آپ کی سائٹ لائیو ہے! 🚀

---

# 🔥 اگلے قدم

## فوری:
- [ ] سائٹ کھولیں: https://knowledge-mapper.vercel.app
- [ ] دوستوں کو دکھائیں
- [ ] GitHub star دیں 😄

## بعدوں:
- [ ] Domain شامل کریں
- [ ] API بنائیں
- [ ] Database سے جوڑیں
- [ ] مزید Pages شامل کریں

---

# 🆘 Troubleshooting

## مسئلہ: "404 Not Found"

**حل:**
1. Vercel میں Deployments چیک کریں
2. Build log دیکھیں
3. کوئی error ہے؟
4. Local میں test کریں:
   ```bash
   npm install
   npm run build
   ```

## مسئلہ: "Build Failed"

**حل:**
```bash
# Local میں
git add .
git commit -m "Fix build"
git push

# Vercel خود بخود دوبارہ build کرے گا
```

## مسئلہ: "Changes نہیں دیکھ رہے"

**حل:**
1. GitHub میں push کریں
2. Vercel میں "Redeploy" کلیک کریں
3. 2-3 منٹ صبر کریں

---

# 📝 مفید Commands

```bash
# GitHub
git add .                    # تمام تبدیلیاں شامل کریں
git commit -m "Message"     # محفوظ کریں
git push                    # Upload کریں
git pull                    # Download کریں

# Local Testing
npm install                 # Dependencies install
npm run dev                 # Local سایٹ (http://localhost:3000)
npm run build               # Production build
```

---

# 🎓 اہم نکات

```
✅ GitHub = کوڈ سے store کریں
✅ Vercel = سائٹ کو لائیو کریں
✅ Git push = خود بخود Vercel build کرے
✅ .gitignore = node_modules upload نہ کریں
✅ Environment = sensitive ڈیٹا محفوظ رکھیں
```

---

# 🌐 Domain شامل کرنا (Optional)

### اگر اپنا Domain چاہتے ہو:

1. Domain خریدیں (GoDaddy, Namecheap)
2. Vercel Settings → Domains
3. Domain شامل کریں
4. DNS settings تبدیل کریں
5. 30 منٹ انتظار کریں

---

# 💬 مثالیں

## نیا Page شامل کرنا:

```
1. فائل بنائیں: src/app/about/page.tsx
2. Code لکھیں:

export default function About() {
  return <h1>درباره</h1>
}

3. Git میں push کریں
4. Vercel خود build کرے
5. https://your-site.com/about کھولیں
```

---

# ✨ خلاصہ

```
GitHub ← → Vercel
  ↓        ↓
CODE    LIVE SITE
  ↓        ↓
your-repo.com  your-site.vercel.app
```

---

# 🎉 مبارک!

اب آپ ایک **full-stack developer** ہو! 🚀

**اگلے:** بہتریاں شامل کریں اور celebrate کریں! 🎊

---

## 📞 Help

- **Vercel Help:** https://vercel.com/support
- **Next.js Docs:** https://nextjs.org
- **GitHub Help:** https://docs.github.com

**موفق باشیں!** ⭐
