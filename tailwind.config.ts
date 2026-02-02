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
        background: '#08090C',
        foreground: '#F0F2F5',
        card: {
          DEFAULT: '#0D1117',
          hover: '#151B25',
        },
        muted: {
          DEFAULT: '#21262D',
          foreground: '#8B949E',
        },
        primary: {
          DEFAULT: '#6366F1',
          foreground: '#FFFFFF',
          glow: 'rgba(99, 102, 241, 0.25)',
        },
        secondary: {
          DEFAULT: '#1C2128',
          foreground: '#C9D1D9',
        },
        destructive: {
          DEFAULT: '#F85149',
          foreground: '#FFFFFF',
        },
        border: '#30363D',
        ring: '#58A6FF',
        canvas: {
          DEFAULT: '#08090C',
          deep: '#050508',
          card: '#0D1117',
        },
        surface: {
          DEFAULT: '#0D1117',
          elevated: '#161B22',
          highlight: '#1C2128',
        },
        text: {
          primary: '#F0F2F5',
          secondary: '#8B949E',
          muted: '#6E7681',
        },
        accent: {
          DEFAULT: '#6366F1',
          blue: '#58A6FF',
          cyan: '#56D4DD',
          purple: '#A371F7',
        },
        success: '#3FB950',
        warning: '#D29922',
        danger: '#F85149',
        steel: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'badge': '6px',
      },
      fontSize: {
        'display': ['32px', { lineHeight: '40px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'page': ['24px', { lineHeight: '32px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'page-title': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'section': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'secondary': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'meta': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'micro': ['11px', { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.02em' }],
      },
      spacing: {
        'micro': '4px',
        'tight': '8px',
        'compact': '12px',
        'default': '16px',
        'section': '24px',
        'major': '32px',
        'page': '48px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.2)',
        'card': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)',
        'gradient-steel': 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
      },
    },
  },
  plugins: [],
}
export default config
