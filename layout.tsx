import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'نقشه‌کش دانش | Knowledge Mapper',
  description: 'پلتفرم نگاشت دانش دیجیتالی شخصی - AI Personal Knowledge Mapping Platform',
  keywords: ['دانش', 'یادگیری', 'فلسفه', 'Knowledge', 'Learning', 'Philosophy'],
  authors: [{ name: 'Knowledge Mapper Team' }],
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: 'https://knowledge-mapper.vercel.app',
    title: 'نقشه‌کش دانش',
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
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>🧠</text></svg>" />
      </head>
      <body className="bg-dark-950 text-white antialiased">
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
