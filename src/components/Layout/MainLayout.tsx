'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-transparent">{children}</main>
      <Footer />
    </div>
  )
}
