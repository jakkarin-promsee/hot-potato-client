import { defineConfig } from 'vite'
import path from "path";
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss()
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
        // Pin the three huge editor vendors to stable named chunks so browser
        // caching survives app-code redeploys. They are only imported by lazy
        // routes, so they stay lazy. Do NOT add react/react-dom/router here.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/]fabric[\\/]/.test(id)) return "fabric";
          if (/[\\/]node_modules[\\/]katex[\\/]/.test(id)) return "katex";
          if (/[\\/]node_modules[\\/](@tiptap|prosemirror-|tiptap-markdown)/.test(id)) return "tiptap";
        },
      },
    },
  },
})
