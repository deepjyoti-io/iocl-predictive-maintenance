/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        surface:      { DEFAULT: '#EEF1F4', dark: '#070B10' },
        panel:        { DEFAULT: '#FFFFFF', dark: '#0F1620' },
        'panel-alt':  { DEFAULT: '#F7F9FB', dark: '#131B26' },
        line:         { DEFAULT: '#D3DAE1', dark: '#1C2836' },
        // Text
        ink:          { DEFAULT: '#101823', dark: '#E8EEF4' },
        'ink-muted':  { DEFAULT: '#5B6773', dark: '#6B7A8D' },
        // Signal colors (status / data)
        cyan:         { DEFAULT: '#0891B2', dark: '#22D3EE' },
        amber:        { DEFAULT: '#C77800', dark: '#F5A623' },
        crimson:      { DEFAULT: '#DC2626', dark: '#FF4757' },
      },
      fontFamily: {
        display: ['"Rajdhani"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 30px -5px rgba(34, 211, 238, 0.45)',
        'glow-amber': '0 0 30px -5px rgba(245, 166, 35, 0.45)',
        'glow-crimson': '0 0 30px -5px rgba(255, 71, 87, 0.5)',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(2000%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      },
      animation: {
        scan: 'scan 4s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
