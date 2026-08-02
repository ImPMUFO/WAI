import type { Metadata } from 'next'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'من کیستم؟ پایگاه دانش',
  description: 'پلتفرم نگاشت دانش دیجیتالی شخصی',
  keywords: ['دانش', 'یادگیری', 'فلسفه', 'Knowledge', 'Learning'],
  authors: [{ name: 'WAI' }],
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    title: 'من کیستم؟ پایگاه دانش',
    description: 'پلتفرم نگاشت دانش دیجیتالی شخصی',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
          <div className="min-h-screen flex flex-col">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}
