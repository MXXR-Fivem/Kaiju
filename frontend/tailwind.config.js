/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kaiju: {
          bg: '#0a0d14',
          card: '#111726',
          border: '#1e293b',
          text: '#f8fafc',
          muted: '#94a3b8',
          accent: '#38bdf8',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          marine: '#0284c7',
        },
        crisis: {
          lv1: '#10b981', // Surveillance verte
          lv2: '#38bdf8', // Vigilance bleue
          lv3: '#f59e0b', // Alerte jaune / transferts
          lv4: '#ea580c', // Crise orange / réquisitions
          lv5: '#ef4444', // Catastrophe rouge / urgence absolue
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radar 4s linear infinite',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
