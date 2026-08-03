use std::ffi::OsStr;

use async_trait::async_trait;
use serde::Serialize;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System, UpdateKind, Users};
use tokio::sync::Mutex;

use super::Collector;

/// 榜单长度。全量快照每秒经 WS/SSE 推一帧，进程榜单只是"谁在占资源"
/// 的概览，10 条足够；想看完整列表的场景应该走 `ps`/宿主机工具，
/// 不该把这个监控接口变成进程列表代理。
const TOP_N: usize = 10;

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    /// 父进程 PID。init / 内核线程没有父进程（stat 里 ppid = 0）时为 null。
    pub ppid: Option<u32>,
    pub name: String,
    /// 用户名。解析优先级：real UID → effective UID → 数值。
    /// UID 查不到对应用户名时（孤儿 UID、容器里映射缺失等）回退显示
    /// UID 数值；real / effective UID 都拿不到（内核线程）才是空字符串。
    pub user: String,
    /// 完整命令行（argv 用空格拼接）。内核线程、权限不足读不到
    /// /proc/<pid>/cmdline 时为空字符串。注意命令行参数里可能带着
    /// 敏感信息（`-p password`、token 之类），这个接口目前无鉴权，
    /// 对外暴露前要权衡（README 里鉴权中间件仍是 TODO）。
    pub cmd: String,
    /// 100% = 占满一个核，多线程进程可以超过 100%。
    pub cpu_percent: f32,
    /// RSS，实际占用的物理内存。
    pub mem_bytes: u64,
    /// 虚拟地址空间大小（VSZ），含 mmap、保留未用的部分，
    /// 通常远大于 RSS——JVM/Go 进程动辄几 GB 是正常的，不代表
    /// 物理内存占用。排序榜单用的是 RSS（mem_bytes），不是这个值。
    pub virtual_mem_bytes: u64,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessMetric {
    pub process_count: usize,
    pub top_by_cpu: Vec<ProcessInfo>,
    pub top_by_mem: Vec<ProcessInfo>,
}

/// 进程采集器只保留 CPU/内存 Top N + 进程总数，不缓存全量进程列表：
/// WS/SSE 每秒推的是全量快照，塞一个几百条的完整进程表会让每帧
/// JSON 体积失控，而客户端几乎不会逐条消费。
///
/// 跟 CpuCollector 一样内部持有长期存活的 System：per-process 的
/// cpu_percent 也是靠两次刷新的差值算出来的，必须复用同一个实例。
/// 构造时的 new_with_specifics 完成第一次刷新建立基线，所以第一轮
/// collect 的 cpu 值就有效（不会像全新实例那样全为 0）。
pub struct ProcessCollector {
    sys: Mutex<System>,
    /// 用户名解析用的独立用户列表（/etc/passwd 那一份）。System 只给
    /// UID，UID → 用户名的映射要靠它；用户变化极不频繁，但每轮刷新
    /// 一次的成本也只是重读一次 passwd，无所谓。
    users: Mutex<Users>,
}

impl ProcessCollector {
    pub fn new() -> Self {
        let sys = System::new_with_specifics(
            // 不取 exe 路径、环境变量、磁盘 IO 等——everything() 在 Linux
            // 上意味着遍历每个 /proc/<pid>/ 的更多文件，用不到的字段不取。
            // cmd / user 用 OnlyIfNotSet：命令行和属主 UID 在进程生命周期内
            // 不变，取过一次就不必每轮重读（cmdline 是这几项里单进程读取
            // 成本最高的）。注意 user 不开的话 Process::user_id() 永远是
            // None，sysinfo 把它也视为按需采集项。
            RefreshKind::nothing().with_processes(
                ProcessRefreshKind::nothing()
                    .with_cpu()
                    .with_memory()
                    .with_cmd(UpdateKind::OnlyIfNotSet)
                    .with_user(UpdateKind::OnlyIfNotSet),
            ),
        );
        Self {
            sys: Mutex::new(sys),
            users: Mutex::new(Users::new_with_refreshed_list()),
        }
    }
}

impl Default for ProcessCollector {
    fn default() -> Self {
        Self::new()
    }
}

fn to_info(p: &sysinfo::Process, users: &Users) -> ProcessInfo {
    // 用户名优先，real UID 拿不到时用 effective UID（setuid 程序
    // 的属主身份）；解析不到用户名（孤儿 UID、容器里 passwd 映射
    // 缺失）回退到 UID 数值——数值本身也是有效信息，空着反而让人
    // 以为是采集失败。
    let user = p
        .user_id()
        .or_else(|| p.effective_user_id())
        .map(|uid| {
            users
                .get_user_by_id(uid)
                .map(|u| u.name().to_string())
                .unwrap_or_else(|| uid.to_string())
        })
        .unwrap_or_default();

    ProcessInfo {
        pid: p.pid().as_u32(),
        ppid: p.parent().map(|pid| pid.as_u32()),
        // 0.33 起 name/cmd 返回 &OsStr / &[OsStr]（进程名和命令行不是
        // 合法 UTF-8 也是合法的），lossy 转换，个别坏字符替换为 U+FFFD。
        name: p.name().to_string_lossy().into_owned(),
        user,
        cmd: p.cmd().join(OsStr::new(" ")).to_string_lossy().into_owned(),
        cpu_percent: p.cpu_usage(),
        mem_bytes: p.memory(),
        virtual_mem_bytes: p.virtual_memory(),
    }
}

#[async_trait]
impl Collector for ProcessCollector {
    type Metric = ProcessMetric;

    async fn collect(&self) -> anyhow::Result<ProcessMetric> {
        let mut sys = self.sys.lock().await;
        // 0.32 起 refresh_processes 要求显式给范围和"是否清理已死进程"。
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let mut users = self.users.lock().await;
        users.refresh();

        let processes = sys.processes();
        let mut by_cpu: Vec<ProcessInfo> = processes.values().map(|p| to_info(p, &users)).collect();
        let mut by_mem = by_cpu.clone();

        by_cpu.sort_by(|a, b| b.cpu_percent.total_cmp(&a.cpu_percent));
        by_cpu.truncate(TOP_N);
        by_mem.sort_by(|a, b| b.mem_bytes.cmp(&a.mem_bytes));
        by_mem.truncate(TOP_N);

        Ok(ProcessMetric {
            process_count: processes.len(),
            top_by_cpu: by_cpu,
            top_by_mem: by_mem,
        })
    }

    fn name(&self) -> &'static str {
        "process"
    }
}
