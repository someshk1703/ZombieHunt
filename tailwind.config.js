/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        'surface-2': '#1a1a1a',
        border: '#2a2a2a',
        red: '#cc0000',
        'red-glow': '#ff000033',
        green: '#00ff41',
        text: '#e8e8e8',
        'text-muted': '#666666',
        warning: '#ff6b00',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
