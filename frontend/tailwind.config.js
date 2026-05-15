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
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease forwards",
      },
    },
  },
  plugins: [],
}
