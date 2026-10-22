import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        aqi: {
          good: '#16803c',
          moderate: '#b77900',
          sensitive: '#c45a16',
          unhealthy: '#c52222',
          veryUnhealthy: '#7e3bb2',
          hazardous: '#7f1d1d',
          unknown: '#64748b'
        }
      },
      boxShadow: {
        dashboard: '0 18px 45px -30px rgb(16 33 28 / 0.32)',
        soft: '0 12px 30px -24px rgb(16 33 28 / 0.25)'
      }
    }
  },
  plugins: []
} satisfies Config;
