/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stop1: "#F0997B",
        stop2: "#5DCAA5",
        stop3: "#AFA9EC",
        stopRest: "#888780",
      },
    },
  },
  plugins: [],
}
