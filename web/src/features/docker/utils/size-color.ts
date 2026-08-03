// Docker 体积阈值染色：容器可写层或镜像异常增大通常意味着磁盘占用
// 失控（容器绕过 volume 直接写层、旧镜像没清理）。>500 GiB 警告色，
// >1 TiB 危险色，其余绿色。阈值按 1024 进制，与 formatBytes 的
// 显示单位一致。
export function sizeColor(bytes: number): string {
  if (bytes > 2 ** 40) return "text-red-500";
  if (bytes > 500 * 2 ** 30) return "text-yellow-500";
  return "text-green-500";
}
