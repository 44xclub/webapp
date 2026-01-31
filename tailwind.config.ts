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
        // 44CLUB Color System
        // Background / Canvas
        canvas: {
          DEFAULT: '#0A1220',
          deep: '#060B14',
          card: '#0F172A',
        },
        // Surface / Cards
        surface: {
          DEFAULT: '#121B2E',
          elevated: '#162038',
        },
        // Borders / Dividers
        border: {
          DEFAULT: '#1F2A44',
        },
        // Text
        text: {
          primary: '#E6EAF2',
          secondary: '#9AA4BF',
          muted: '#6B7280',
        },
        // Accents (used sparingly)
        accent: {
          DEFAULT: '#6D5EF3',  // 44CLUB Purple
          blue: '#3B82F6',     // Electric Blue
        },
        // Status colors
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      borderRadius: {
        'card': '16px',
        'button': '10px',
      },
      fontSize: {
        // Type scale
        'page': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'section': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'secondary': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'meta': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      spacing: {
        // Spacing scale
        'micro': '4px',
        'tight': '8px',
        'compact': '12px',
        'default': '16px',
        'section': '24px',
        'major': '32px',
        'page': '48px',
      },
    },
  },
  plugins: [],
}
export default config
