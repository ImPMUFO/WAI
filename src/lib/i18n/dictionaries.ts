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
  feature2Title: 'نقشه ذهنی',
  feature2Desc: 'ببین چه می‌دانی و افق یادگیری‌ات کجاست',
  feature3Title: 'پیشرفت و بازی',
  feature3Desc: 'امتیاز، مأموریت و بازی‌های آموزشی',
  chooseDomain: 'از کجا شروع می‌کنی؟',
  chooseDomainHint: 'یک حوزه را انتخاب کن. همه گفتگوها روی یک نقشه ذهنی واحد جمع می‌شوند.',
  mindMap: 'نقشه ذهنی',
  games: 'بازی‌ها',
  login: 'ورود',
  signup: 'ثبت‌نام',
  logout: 'خروج',
  language: 'زبان',
  appearance: 'پوسته ظاهری',
  ctaTitle: 'ذهنت را ترسیم کن',
  ctaBody: 'با گفتگو، بازی و نقشه ذهنی مسیر رشدت را ببین.',
  home: 'خانه',
  account: 'حساب من',
  beta: 'نسخه زنده',
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
  chooseDomainHint: 'Pick a field. Every conversation updates one unified mind map.',
  mindMap: 'Mind map',
  games: 'Games',
  login: 'Log in',
  signup: 'Sign up',
  logout: 'Log out',
  language: 'Language',
  appearance: 'Appearance',
  ctaTitle: 'Map your mind',
  ctaBody: 'Learn through dialogue, play, and your living mind map.',
  home: 'Home',
  account: 'My account',
  beta: 'Live version',
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
  chooseDomainHint: 'اختر مجالاً. كل حوار يغذي خريطة ذهنية واحدةحدة.',
  mindMap: 'الخريطة الذهنية',
  games: 'الألعاب',
  login: 'تسجيل الدخول',
  signup: 'إنشاء حساب',
  logout: 'خروج',
  language: 'اللغة',
  appearance: 'المظهر',
  ctaTitle: 'ارسم عقلك',
  ctaBody: 'تعلّم بالحوار واللعب وخريطتك الذهنية.',
  home: 'الرئيسية',
  account: 'حسابي',
  beta: 'النسخة الحية',
}

export const dictionaries = { fa, en, ar }
export type Dictionary = typeof fa

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.fa
}

export const LANG_KEY = 'waima_locale'
