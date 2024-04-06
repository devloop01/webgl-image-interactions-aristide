import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
    },
  },

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        index1: resolve(__dirname, "index1.html"),
        index2: resolve(__dirname, "index2.html"),
      },
    },
  },
});
