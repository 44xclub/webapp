import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Stoic dark palette - sharp and minimal
        dark: {
          950: '#050508',
          900: '#09090b',
          800: '#0f0f12',
          700: '#141419',
          600: '#1a1a1f',
          500: '#27272a',
          400: '#3f3f46',
          300: '#52525b',
        },
      },
    },
  },
  plugins: [],
}
export default config
