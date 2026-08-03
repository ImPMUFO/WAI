export type Locale = 'fa' | 'en' | 'ar'

export const locales: Locale[] = ['fa', 'en', 'ar']

export const localeMeta: Record<Locale, { label: string; dir: 'rtl' | 'ltr'; flag: string }> = {
  fa: { label: 'فارسی', dir: 'rtl', flag: '🇮🇷' },
  en: { label: 'English', dir: 'ltr', flag: '🇺🇸' },
  ar: { label: 'العربية', dir: 'rtl', flag: '🇸🇦' },
}

const fa = {
  brandName: 'WAIMA',
  brandTag: 'من کیستم؟',
  brandSub: 'ترسیم‌گر ذهنی',
  start: 'شروع کنید',
  featuresTitle: 'چرا WAIMA؟',
  feature1Title: 'گفتگوی هوشمند',
  feature1Desc: 'ارزیابی و آموزش در یک گفتگوی کوتاه و زنده',
  feature2Title: 'نقشه ذهن',
  feature2Desc: 'ببین چه می‌دانی و افق یادگیری‌ات کجاست',
  feature3Title: 'پیشرفت و بازی',
  feature3Desc: 'امتیاز، مأموریت و بازی‌های آموزشی',
  chooseDomain: 'از کجا شروع می‌کنی؟',
  mindMap: 'نقشه ذهن',
  games: 'بازی‌ها',
  login: 'ورود',
  signup: 'ثبت‌نام',
  logout: 'خروج',
  language: 'زبان',
  appearance: 'پوسته ظاهری',
  ctaTitle: 'ذهنت را ترسیم کن',
  ctaBody: 'با گفتگو، بازی و نقشه ذهن مسیر رشدت را ببین.',
}

const en: typeof fa = {
  brandName: 'WAIMA',
  brandTag: 'Who am I?',
  brandSub: 'Mind Mapper',
  start: 'Get started',
  featuresTitle: 'Why WAIMA?',
  feature1Title: 'Smart dialogue',
  feature1Desc: 'Assess and learn in a short, lively conversation',
  feature2Title: 'Mind map',
  feature2Desc: 'See what you know and what lies ahead',
  feature3Title: 'Progress & play',
  feature3Desc: 'XP, missions, and learning games',
  chooseDomain: 'Where do you start?',
  mindMap: 'Mind map',
  games: 'Games',
  login: 'Log in',
  signup: 'Sign up',
  logout: 'Log out',
  language: 'Language',
  appearance: 'Appearance',
  ctaTitle: 'Map your mind',
  ctaBody: 'Learn through dialogue, play, and your living mind map.',
}

const ar: typeof fa = {
  brandName: 'WAIMA',
  brandTag: 'من أنا؟',
  brandSub: 'راسم الخريطة الذهنية',
  start: 'ابدأ',
  featuresTitle: 'لماذا WAIMA؟',
  feature1Title: 'حوار ذكي',
  feature1Desc: 'تقييم وتعلّم في محادثة قصيرة وحية',
  feature2Title: 'خريطة ذهنية',
  feature2Desc: 'اعرف ما تتقنه وما ينتظرك',
  feature3Title: 'تقدّم وألعاب',
  feature3Desc: 'نقاط ومهام وألعاب تعليمية',
  chooseDomain: 'من أين تبدأ؟',
  mindMap: 'الخريطة الذهنية',
  games: 'الألعاب',
  login: 'تسجيل الدخول',
  signup: 'إنشاء حساب',
  logout: 'خروج',
  language: 'اللغة',
  appearance: 'المظهر',
  ctaTitle: 'ارسم عقلك',
  ctaBody: 'تعلّم بالحوار واللعب وخريطتك الذهنية.',
}

export const dictionaries = { fa, en, ar }
export type Dictionary = typeof fa

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.fa
}
