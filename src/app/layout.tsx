import type { Metadata } from 'next'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import { LocaleProvider } from '@/lib/i18n/LocaleProvider'
import GlobalWheelHost from '@/components/GlobalWheelHost'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://waima.vercel.app'),
  title: {
    default: 'WAIMA | من کیستم؟ | ترسیم‌گر ذهنی',
    template: '%s | WAIMA',
  },
  description: 'WAIMA همراه شناخت و رشد دانش: گفتگو، نقشه دانش زنده، بازی و قدم بعدی شخصی.',
  keywords: ['WAIMA', 'من کیستم', 'ترسیم‌گر ذهنی', 'mind map', 'learning'],
  authors: [{ name: 'WAIMA' }],
  verification: {
    google: 'OTuv6aZFdCqFsNVe9VyUzmLBOpTORUm0Bv9up6TK1gw',
  },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    title: 'WAIMA | من کیستم؟',
    description: 'ترسیم‌گر ذهنی – یادگیری گفتگویی و نقشه دانش شخصی',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WAIMA | من کیستم؟',
    description: 'ترسیم‌گر ذهنی و نقشه دانش شخصی',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>🧠</text></svg>"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <LocaleProvider>
            <div className="min-h-screen flex flex-col">{children}</div>
            <GlobalWheelHost />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
