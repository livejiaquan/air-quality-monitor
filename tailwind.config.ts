import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    // The only allowed type scale (visual standard A): 12/14/16/18/22/28/36/48/64/96.
    fontSize: {
      xs: ['12px', { lineHeight: '1.5' }],
      sm: ['14px', { lineHeight: '1.6' }],
      base: ['16px', { lineHeight: '1.7' }],
      lg: ['18px', { lineHeight: '1.6' }],
      xl: ['22px', { lineHeight: '1.4' }],
      '2xl': ['28px', { lineHeight: '1.3' }],
      '3xl': ['36px', { lineHeight: '1.2' }],
      '4xl': ['48px', { lineHeight: '1.1' }],
      '5xl': ['64px', { lineHeight: '1' }],
      '6xl': ['96px', { lineHeight: '1' }]
    },
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
