/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ...existing code...
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
    // If you have other plugins, they would be here
  ],
};