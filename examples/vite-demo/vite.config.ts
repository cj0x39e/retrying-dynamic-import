import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import retryingDynamicImport from "vite-plugin-retrying-dynamic-import";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), retryingDynamicImport()],
  build: {
    cssCodeSplit: false,
    modulePreload: false,
  },
});
