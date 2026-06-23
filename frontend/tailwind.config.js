/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ifam: { verde: "#2f9e41", vermelho: "#cd191e", preto: "#000000" },
        primary: { DEFAULT: "#2f9e41", hover: "#25803a", fg: "#ffffff" },
        destructive: { DEFAULT: "#cd191e", hover: "#a8141a", fg: "#ffffff" },
      },
      fontFamily: { sans: ['"Open Sans"', "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
