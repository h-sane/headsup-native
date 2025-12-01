/** @type {import('tailwindcss').Config} */
module.exports = {
  // This tells Tailwind to look at App.js and any file inside a 'src' folder
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}