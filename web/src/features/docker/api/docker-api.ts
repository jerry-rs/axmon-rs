import { api } from "@/lib/api-client";

// 对应后端 collectors/docker.rs 的 DockerMetric / ContainerMetric / ImageMetric。
// 外层 Timestamped 信封经 serde flatten 平铺（见 scheduler.rs），camelCase。
export interface PortInfo {
  /** 宿主机绑定 IP；只 EXPOSE 未 publish 时为 null。 */
  ip: string | null;
  privatePort: number;
  /** 宿主机映射端口；只 EXPOSE 未 publish 时为 null。 */
  publicPort: number | null;
  protocol: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  /** 创建时间，unix 秒。 */
  createdAt: number;
  /** 容器可写层大小（docker ps -s 括号外部分）。 */
  sizeRwBytes: number;
  /** 镜像层 + 可写层（docker ps -s 的 "virtual" 部分）。 */
  sizeRootFsBytes: number;
  /** running / exited / paused / …，判断用。 */
  state: string;
  /** 人类可读描述："Up 2 hours"，展示用。 */
  status: string;
  command: string;
  ports: PortInfo[];
}

export interface ImageInfo {
  id: string;
  /** repo:tag；dangling 镜像回退 repo digest 或 "<none>"。 */
  name: string;
  createdAt: number;
  sizeBytes: number;
}

export interface DockerMetric {
  collectedAtUnixMs: number;
  images: ImageInfo[];
  containers: ContainerInfo[];
  /** Docker socket 连不上时是 false——功能不可用，不是错误。 */
  available: boolean;
}

export function fetchDockerMetric(): Promise<DockerMetric> {
  return api.get<DockerMetric>("/metrics/docker");
}
