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
        midnight: {
          deep: '#020617',
          dark: '#0F172A',
          card: '#1E293B',
          border: '#334155'
        },
        corporate: {
          primary: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
