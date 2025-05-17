import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: '/', // Ensure this is set
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [react(), tailwindcss()],
});
