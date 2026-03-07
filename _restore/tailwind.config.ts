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
        kunfa: {
          green: '#10B981',
          'green-dark': '#059669',
          navy: '#0F172A',
          'card-dark': '#1E293B',
          'text-primary': '#0F172A',
          'text-secondary': '#64748B',
          'light-bg': '#F8FAFC',
          orange: '#F97316',
          indigo: '#6366F1',
          yellow: '#EAB308',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 30s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(16, 185, 129, 0.3), 0 0 10px rgba(16, 185, 129, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.2)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
