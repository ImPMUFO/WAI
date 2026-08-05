import type { Metadata } from 'next'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import { LocaleProvider } from '@/lib/i18n/LocaleProvider'

export const metadata: Metadata = {
  title: 'WAIMA | من کیستم؟ | ترسیم‌گر ذهنی',
  description: 'WAIMA – ترسیم‌گر ذهنی. گفتگوی هوشمند، نقشه ذهن، یادگیری و پیشرفت.',
  keywords: ['WAIMA', 'من کیستم', 'ترسیم‌گر ذهنی', 'mind map', 'learning'],
  authors: [{ name: 'WAIMA' }],
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    title: 'WAIMA | من کیستم؟',
    description: 'ترسیم‌گر ذهنی – یادگیری گفتگویی و نقشه دانش شخصی',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>🧠</text></svg>"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <LocaleProvider>
            <div className="min-h-screen flex flex-col">{children}</div>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
