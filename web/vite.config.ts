import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 关键配置：输出到 Rust 项目根目录下的 dist
    outDir: '../dist',
    // 允许清空根目录下的 dist 文件夹
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        // target: "http://localhost:1000",
        target: "http://10.13.21.43:1000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },
})
