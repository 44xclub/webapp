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
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Additional blue accent shades
        'accent-light': '#60a5fa',
        'accent-dark': '#1d4ed8',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '16px',
      },
      boxShadow: {
        'sm': '0 10px 26px rgba(0,0,0,.36)',
        'md': '0 18px 50px rgba(0,0,0,.46)',
        'lg': '0 28px 90px rgba(0,0,0,.62)',
        'glow': '0 0 20px rgba(59,130,246,.20)',
        'glow-lg': '0 0 60px rgba(59,130,246,.12)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(.2,.8,.2,1)',
      },
      transitionDuration: {
        'fast': '140ms',
        'med': '220ms',
      },
    },
  },
  plugins: [],
}
export default config
