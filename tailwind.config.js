/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#020617',
          900: '#0a1628',
          800: '#0f2744',
          700: '#1a3a5c',
        },
        primary: {
          400: '#2dd4bf', // فیروزه‌ای
          500: '#14b8a6', // سبز-آبی
          600: '#0d9488',
        },
        accent: {
          400: '#fbbf24', // طلایی نرم
          500: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['var(--font-vazir)', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
