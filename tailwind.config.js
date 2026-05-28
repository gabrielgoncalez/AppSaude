/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#090b10",
        steel: "#111827",
        ember: "#f97316",
        pulse: "#14b8a6",
        danger: "#fb7185",
      },
      boxShadow: {
        lift: "0 18px 60px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
