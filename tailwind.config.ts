import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PingFang TC"', '"Noto Sans TC"', '"Microsoft JhengHei"', 'system-ui', '-apple-system', 'sans-serif'],
        num: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        sunken: token('sunken'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        faint: token('faint'),
        accent: token('accent'),
        warn: token('warn'),
        warnbg: token('warnbg')
      },
      borderRadius: {
        card: '1.5rem',
        control: '0.75rem'
      },
      transitionDuration: {
        DEFAULT: '120ms',
        fast: '120ms',
        base: '200ms'
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)',
        snappy: 'cubic-bezier(0.2, 0, 0, 1)'
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.12)'
      }
    }
  },
  plugins: []
} satisfies Config;
