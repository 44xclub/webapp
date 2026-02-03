import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      colors: {
        background: '#07090d',
        foreground: '#eef2ff',
        card: {
          DEFAULT: 'rgba(255,255,255,0.045)',
          hover: 'rgba(255,255,255,0.06)',
          solid: '#0d1014',
        },
        muted: {
          DEFAULT: 'rgba(255,255,255,0.045)',
          foreground: 'rgba(238,242,255,0.72)',
        },
        primary: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#1d4ed8',
          foreground: '#FFFFFF',
          glow: 'rgba(59,130,246,0.18)',
        },
        secondary: {
          DEFAULT: 'rgba(255,255,255,0.028)',
          foreground: 'rgba(238,242,255,0.72)',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#FFFFFF',
        },
        border: 'rgba(255,255,255,0.10)',
        ring: '#3b82f6',
        canvas: {
          DEFAULT: '#07090d',
          deep: '#05070a',
          card: 'rgba(255,255,255,0.045)',
        },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.045)',
          elevated: 'rgba(255,255,255,0.06)',
          highlight: 'rgba(255,255,255,0.08)',
        },
        text: {
          primary: '#eef2ff',
          secondary: 'rgba(238,242,255,0.72)',
          muted: 'rgba(238,242,255,0.52)',
        },
        accent: {
          DEFAULT: '#3b82f6',
          blue: '#60a5fa',
          dark: '#1d4ed8',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        line: {
          DEFAULT: 'rgba(255,255,255,0.10)',
          subtle: 'rgba(255,255,255,0.07)',
        },
      },
      borderRadius: {
        'sm': '10px',
        'md': '12px',
        'lg': '14px',
        'xl': '16px',
        'card': '16px',
        'button': '12px',
        'badge': '10px',
      },
      fontSize: {
        'display': ['clamp(38px, 4.6vw, 52px)', { lineHeight: '1.08', fontWeight: '700', letterSpacing: '-1.2px' }],
        'page': ['clamp(32px, 2.7vw, 36px)', { lineHeight: '1.12', fontWeight: '700', letterSpacing: '-0.7px' }],
        'page-title': ['18px', { lineHeight: '1.65', fontWeight: '600' }],
        'section': ['15px', { lineHeight: '1.75', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.75', fontWeight: '400' }],
        'secondary': ['13px', { lineHeight: '1.65', fontWeight: '400' }],
        'meta': ['12px', { lineHeight: '1.65', fontWeight: '900', letterSpacing: '0.8px' }],
        'micro': ['12px', { lineHeight: '1.65', fontWeight: '900', letterSpacing: '0.6px' }],
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
        'sm': '0 10px 26px rgba(0,0,0,0.36)',
        'md': '0 18px 50px rgba(0,0,0,0.46)',
        'lg': '0 28px 90px rgba(0,0,0,0.62)',
        'glow': '0 10px 28px rgba(59,130,246,0.12)',
        'glow-lg': '0 12px 34px rgba(59,130,246,0.14)',
        'card': '0 10px 26px rgba(0,0,0,0.36)',
        'elevated': '0 18px 50px rgba(0,0,0,0.46)',
        'focus': '0 0 0 4px rgba(59,130,246,0.18)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-primary': 'linear-gradient(180deg, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.08) 100%)',
        'gradient-surface': 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.03) 100%)',
        'bg-glow': 'radial-gradient(1100px 700px at 15% 10%, rgba(96,165,250,0.08), transparent 60%), radial-gradient(950px 720px at 85% 18%, rgba(59,130,246,0.06), transparent 62%), radial-gradient(900px 820px at 50% 110%, rgba(29,78,216,0.08), transparent 65%)',
      },
      transitionTimingFunction: {
        'ease-custom': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
export default config
