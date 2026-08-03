import { createBrowserRouter } from "react-router";

import { RootLayout } from "@/layouts/root-layout";

// 每个页面用路由级 lazy 按需加载：Vite 按动态 import 把各 feature 打成
// 独立 chunk，首屏只带 layout + 当前页。lazy 是 data router 的原生能力，
// 模块就绪前导航会等待，不需要自己包 Suspense。
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("@/features/home/pages/home-page")).HomePage,
        }),
      },
      {
        path: "cpu",
        lazy: async () => ({
          Component: (await import("@/features/cpu/pages/cpu-page")).CpuPage,
        }),
      },
      {
        path: "mem",
        lazy: async () => ({
          Component: (await import("@/features/mem/pages/mem-page")).MemPage,
        }),
      },
      {
        path: "disk",
        lazy: async () => ({
          Component: (await import("@/features/disk/pages/disk-page")).DiskPage,
        }),
      },
      {
        path: "process",
        lazy: async () => ({
          Component: (await import("@/features/process/pages/process-page"))
            .ProcessPage,
        }),
      },
      {
        path: "docker",
        lazy: async () => ({
          Component: (await import("@/features/docker/pages/docker-page"))
            .DockerPage,
        }),
      },
      {
        path: "gpu",
        lazy: async () => ({
          Component: (await import("@/features/gpu/pages/gpu-page")).GpuPage,
        }),
      },
      {
        path: "*",
        lazy: async () => ({
          Component: (await import("@/features/not-found/pages/not-found-page"))
            .NotFoundPage,
        }),
      },
    ],
  },
]);
