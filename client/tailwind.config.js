/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg:      '#07090f',
        surface: '#0f1623',
        surface2:'#151e30',
        border:  '#1c2a42',
      }
    },
  },
  plugins: [],
}
