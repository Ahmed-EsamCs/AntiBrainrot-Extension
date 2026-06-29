/** @type {import('tailwindcss').Config} */
export default {
  content: ["./*.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#090b12",
        panel: "#111522",
        line: "rgba(255,255,255,0.12)",
        cyan: "#45e1ff",
        violet: "#8b5cf6",
        mint: "#5eead4"
      },
      boxShadow: {
        glow: "0 0 40px rgba(69, 225, 255, 0.16)"
      }
    }
  },
  plugins: []
};
