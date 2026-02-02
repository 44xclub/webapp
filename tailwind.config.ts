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
        background: '#0a0a0a',
        foreground: '#F0F2F5',
        card: {
          DEFAULT: '#262626',
          hover: '#333333',
        },
        muted: {
          DEFAULT: '#262626',
          foreground: '#8B949E',
        },
        primary: {
          DEFAULT: '#021959',
          foreground: '#FFFFFF',
          glow: 'rgba(2, 25, 89, 0.35)',
        },
        secondary: {
          DEFAULT: '#1a1a1a',
          foreground: '#C9D1D9',
        },
        destructive: {
          DEFAULT: '#F85149',
          foreground: '#FFFFFF',
        },
        border: '#333333',
        ring: '#021959',
        canvas: {
          DEFAULT: '#0a0a0a',
          deep: '#050505',
          card: '#262626',
        },
        surface: {
          DEFAULT: '#262626',
          elevated: '#333333',
          highlight: '#3d3d3d',
        },
        text: {
          primary: '#F0F2F5',
          secondary: '#a1a1a1',
          muted: '#737373',
        },
        accent: {
          DEFAULT: '#021959',
          blue: '#021959',
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
        'glow': '0 0 20px rgba(2, 25, 89, 0.25)',
        'glow-lg': '0 0 40px rgba(2, 25, 89, 0.35)',
        'card': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(180deg, rgba(2, 25, 89, 0.08) 0%, transparent 100%)',
        'gradient-steel': 'linear-gradient(180deg, #262626 0%, #0a0a0a 100%)',
      },
    },
  },
  plugins: [],
}
export default config
