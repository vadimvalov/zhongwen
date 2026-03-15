import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    sortImports: {},
    sortTailwindcss: {
      stylesheet: "./apps/zhongwen/app/assets/css/main.css",
      functions: ["cn", "clsx"],
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      curly: "error",
    },
  },
});
