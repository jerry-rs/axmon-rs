import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
     alias: {
       "@": path.resolve(import.meta.dirname, "./src"),
     },
   },
  server: {
    proxy: {
      // 开发环境把 /api 转发给 axum 后端，前端代码里直接写相对路径 /api/...，
      // 不带域名，和生产部署（前后端同源）保持一致。
      "/api": {
        target: "http://10.13.21.35:8080",
        changeOrigin: true,
      },
    },
  },
})
