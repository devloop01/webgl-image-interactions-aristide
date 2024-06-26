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
        index3: resolve(__dirname, "index3.html"),
        index4: resolve(__dirname, "index4.html"),
        index5: resolve(__dirname, "index5.html"),
        index6: resolve(__dirname, "index6.html"),
      },
    },
  },
});
