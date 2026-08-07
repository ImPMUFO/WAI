/**
 * ============================================================
 *  ارتباط با ما / درباره سازنده — محتوای آزاد برای ویرایش تو
 * ============================================================
 *
 * هر بلاک یک تکه از صفحه است. ترتیب = همان ترتیب نمایش.
 *
 * انواع بلاک:
 *   heading  → عنوان
 *   text     → پاراگراف (چند خط با \n)
 *   html     → HTML آزاد (هرچی دوست داری)
 *   image    → عکس با url
 *   link     → دکمه/لینک
 *   list     → لیست گلوله‌ای
 *   divider  → خط جداکننده
 *
 * مثال عکس:
 *   { type: 'image', url: 'https://...', caption: 'توضیح اختیاری', alt: '...' }
 *
 * مثال لینک:
 *   { type: 'link', href: 'https://t.me/...', label: 'تلگرام من', external: true }
 *
 * بعد از ویرایش: Commit + Deploy
 */

export type ContactBlock =
  | { type: 'heading'; text: string; level?: 1 | 2 | 3 }
  | { type: 'text'; text: string }
  | { type: 'html'; html: string }
  | { type: 'image'; url: string; caption?: string; alt?: string }
  | { type: 'link'; href: string; label: string; external?: boolean }
  | { type: 'list'; items: string[] }
  | { type: 'divider' }

export const contactPageTitle = 'ارتباط با ما'

export const contactBlocks: ContactBlock[] = [
  {
    type: 'heading',
    text: ' سلام من سازنده سایت - امیرمحمد - هستم ',
    level: 1,
  },
  {
    type: 'text',
    text:
      'این صفحه را خودم می‌نویسم تا مستقیم باهات حرف بزنم.\n' +
      'اگر ایده، باگ، پیشنهاد یا حرفی داری، خوشحال می‌شوم بشنوم.',
  },
  {
    type: 'heading',
    text: 'راه‌های ارتباطی',
    level: 2,
  },
  {
    type: 'list',
    items: [
      'آیدی تلگرامم: @PMUFO',
      'ایمیل پشتیبانی: pmufo@telegmail.com',
    ],
  },
  {
    type: 'link',
    href: 'https://t.me/PMUFO',
    label: 'پیام در تلگرام',
    external: true,
  },
  {
    type: 'divider',
  },
  {
    type: 'heading',
    text: 'تازه‌ها و چیزهایی که باید بدانی',
    level: 2,
  },
  {
    type: 'list',
    items: [
      'ورود با آیدی (بدون ایمیل نمایشی)',
      'بازی‌های روزانه: کوئیز، ارتباط مفاهیم، درست/نادرست',
      'نقشه ذهنی یکپارچه و پروفایل',
      'جدول امتیازات برای همه قابل دیدن است',
    ],
  },
  {
    type: 'heading',
    text: 'در صف اضافه شدن',
    level: 2,
  },
  {
    type: 'text',
    text:
      'این‌ها را می‌خواهم به‌زودی اضافه کنم (متن را آزاد عوض کن):\n' +
      '• بهبود بیشتر نقشه ذهنی\n' +
      '• بازی‌های جدید\n' +
      '• امکانات اجتماعی بیشتر',
  },
]
