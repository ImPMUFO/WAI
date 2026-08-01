'use client'

import Hero from '@/components/Hero'
import MainLayout from '@/components/Layout/MainLayout'

export default function Home() {
  return (
    <MainLayout>
      <Hero />

      {/* Features Section */}
      <section className="py-14 sm:py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">ویژگی‌های اصلی</h2>
            <p className="text-sm sm:text-base text-gray-400">آنچه در این مسیر در انتظارت است</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-2">ارزیابی تطبیقی</h3>
              <p className="text-sm text-gray-300">سیستم سؤال‌پرسی هوشمند که بر اساس دانش واقعی تو مسیرش را تغییر می‌دهد.</p>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-2">نگاشت دانش</h3>
              <p className="text-sm text-gray-300">نمای تعاملی از ساختار دانش، روابط مفاهیم و سرزمین‌های کشف‌نشده.</p>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-2">مدل ذهنی شخصی</h3>
              <p className="text-sm text-gray-300">مدل دیجیتالی از دانش تو که با هر گفت‌وگو به‌روز و دقیق‌تر می‌شود.</p>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-2">مسیر یادگیری شخصی</h3>
              <p className="text-sm text-gray-300">پیشنهاد گام‌های بعدی بر اساس نقاط قوت، ضعف و اهداف تو.</p>
            </div>
          </div>
        </div>
      </section>

    </MainLayout>
  )
}
