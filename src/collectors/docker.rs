use async_trait::async_trait;
use bollard::container::ListContainersOptions;
use bollard::image::ListImagesOptions;
use bollard::Docker;
use serde::Serialize;

use super::Collector;

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ImageMetric {
    pub id: String,
    /// 镜像名（repo:tag）。dangling 镜像没有 tag，回退到 repo digest，
    /// 再不行就是 "<none>"，跟 docker CLI 的显示习惯一致。
    pub name: String,
    /// 创建时间，unix 秒
    pub created_at: i64,
    pub size_bytes: i64,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PortMetric {
    /// 宿主机绑定 IP（"0.0.0.0"、"::1" 等）；只 EXPOSE 未 publish 时为 null。
    pub ip: Option<String>,
    /// 容器侧端口，必有。
    pub private_port: u16,
    /// 宿主机映射端口；只 EXPOSE 未 publish 时为 null。
    pub public_port: Option<u16>,
    /// "tcp" / "udp" / "sctp"。
    pub protocol: String,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ContainerMetric {
    pub id: String,
    pub name: String,
    pub image: String,
    /// 创建时间，unix 秒
    pub created_at: i64,
    /// 容器可写层的大小，对应 `docker ps -s` SIZE 列括号外的部分
    /// （不含镜像本身）。这个值要遍历可写层才能算出来，容器特别多
    /// 时注意采集间隔别开太小。
    pub size_rw_bytes: i64,
    /// 镜像层 + 可写层的总量，对应 `docker ps -s` SIZE 列括号里的
    /// "virtual" 部分。size_root_fs - size_rw ≈ 该容器占用镜像的大小。
    pub size_root_fs_bytes: i64,
    /// 机器可枚举的状态：running / exited / paused / ...（docker ps
    /// 过滤 --filter status= 用的就是这组的枚举值）。
    pub state: String,
    /// 人类可读的状态描述串："Up 2 hours"、"Exited (0) 3 days ago"，
    /// 对应 docker ps 的 STATUS 列。告警判断用 state，展示用 status。
    pub status: String,
    pub command: String,
    /// 端口映射的结构化列表，对应 docker ps 的 PORTS 列。已停止的
    /// 容器、host 网络模式的容器这里是空数组，都属于正常情况。
    pub ports: Vec<PortMetric>,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DockerMetric {
    pub images: Vec<ImageMetric>,
    pub containers: Vec<ContainerMetric>,
    /// Docker socket 连不上（没装 docker / 没权限 / daemon 没起来）时是 false，
    /// 这种情况不当成错误处理，只是这个功能不可用，不影响其他指标。
    pub available: bool,
}

pub struct DockerCollector {
    docker: Option<Docker>,
}

impl DockerCollector {
    pub fn new() -> Self {
        // 连接失败（没装 Docker、socket 权限不对等）时不 panic，退化成
        // "不可用"，跟 GpuCollector 遇到没有 NVIDIA 驱动时的处理方式一致。
        let docker = Docker::connect_with_local_defaults().ok();
        Self { docker }
    }
}

impl Default for DockerCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Collector for DockerCollector {
    type Metric = DockerMetric;

    async fn collect(&self) -> anyhow::Result<DockerMetric> {
        let Some(docker) = &self.docker else {
            return Ok(DockerMetric {
                images: Vec::new(),
                containers: Vec::new(),
                available: false,
            });
        };

        // bollard 内部走的是异步 hyper 客户端，真正的非阻塞 I/O——不需要
        // spawn_blocking，daemon 响应慢的话本身就是 .await 处让出线程，
        // 不会占用 tokio worker；但仍然建议在调用方（调度器/API 层）
        // 对整个 collect() 套一层 timeout，防止 daemon 卡住时这个
        // collector 的后台循环长时间不更新缓存。
        //
        // 两个列表接口都是 daemon 侧的纯查询（容器 size 统计除外），
        // 用 try_join 并发发出去，任一失败整轮算失败、保留旧缓存。
        let (images, containers) = tokio::try_join!(
            docker.list_images(Some(ListImagesOptions::<String> {
                all: false, // 不列中间层镜像，跟 `docker images` 默认输出一致
                ..Default::default()
            })),
            docker.list_containers(Some(ListContainersOptions::<String> {
                all: true,  // 已停止的也列出来，否则 state 恒为 running，没有意义
                size: true, // 需要 size_rw / size_root_fs，见 ContainerMetric 的说明
                ..Default::default()
            })),
        )?;

        let mut images: Vec<ImageMetric> = images
            .into_iter()
            .map(|img| ImageMetric {
                id: img.id,
                name: img
                    .repo_tags
                    .first()
                    .cloned()
                    .or_else(|| img.repo_digests.first().cloned())
                    .unwrap_or_else(|| "<none>".to_string()),
                created_at: img.created,
                size_bytes: img.size,
            })
            .collect();

        // 按占用空间降序：镜像列表的查看场景多半是排查磁盘占用，大头排前面。
        images.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        let mut containers: Vec<ContainerMetric> = containers
            .into_iter()
            .filter_map(|c| {
                let id = c.id?;
                Some(ContainerMetric {
                    id: id.clone(),
                    // API 返回的名字带前导 "/"（"/web"），剥掉对齐 docker ps 的显示；
                    // 拿不到名字时回退到 12 位短 id，跟 docker CLI 一致。
                    name: c
                        .names
                        .and_then(|n| n.first().cloned())
                        .map(|n| n.trim_start_matches('/').to_string())
                        .unwrap_or_else(|| id.chars().take(12).collect()),
                    image: c.image.unwrap_or_default(),
                    created_at: c.created.unwrap_or(0),
                    size_rw_bytes: c.size_rw.unwrap_or(0),
                    size_root_fs_bytes: c.size_root_fs.unwrap_or(0),
                    state: c.state.unwrap_or_default(),
                    status: c.status.unwrap_or_default(),
                    command: c.command.unwrap_or_default(),
                    ports: {
                        let mut ports: Vec<PortMetric> = c
                            .ports
                            .unwrap_or_default()
                            .into_iter()
                            .map(|p| {
                                // PortTypeEnum 的 Display 直接输出小写协议名
                                //（"tcp" / "udp" / "sctp"）。daemon 没上报协议时
                                // 按 docker CLI 的默认回退到 "tcp"。
                                let protocol = p
                                    .typ
                                    .map(|t| t.to_string())
                                    .unwrap_or_else(|| "tcp".to_string());
                                PortMetric {
                                    ip: p.ip,
                                    private_port: p.private_port,
                                    public_port: p.public_port,
                                    protocol,
                                }
                            })
                            .collect();
                        // 按宿主机映射端口升序；只 EXPOSE 未 publish 的
                        //（public_port 为 None）用 MAX 沉底，published 的
                        // 服务端口排前面。次键 private_port 让次序稳定可读。
                        ports.sort_by_key(|p| (p.public_port.unwrap_or(u16::MAX), p.private_port));
                        ports
                    },
                })
            })
            .collect();
        containers.sort_by(|a, b| b.size_rw_bytes.cmp(&a.size_rw_bytes));

        Ok(DockerMetric {
            images,
            containers,
            available: true,
        })
    }

    fn name(&self) -> &'static str {
        "docker"
    }
}
