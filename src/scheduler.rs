use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use std::sync::RwLock;
use tracing::warn;

use crate::collectors::Collector;

/// 带采集时间戳的指标，调度器给缓存数据套的信封。
///
/// `collected_at_unix_ms` 回答的是"这份数据什么时候采到的"，而不是
/// "响应什么时候生成的"：采集失败/超时保留旧缓存时，时间戳也原样保留旧的，
/// 客户端靠它判断新鲜度——比如磁盘 5s 才采一轮，SSE 每秒推的重复帧就靠
/// 这个时间戳去重。值为 0 是哨兵：进程启动后还没成功采到任何一轮。
///
/// 为什么盖在调度层而不是让每个 collector 自己填：
/// "缓存何时被刷新"本来就是调度器的知识；而且采集失败时 collector 根本
/// 没有运行，旧时间戳只能靠调度层"不动缓存"自然保留。
#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Timestamped<T> {
    pub collected_at_unix_ms: u64,
    /// flatten 让时间戳和指标字段平铺在同一层 JSON 对象里，
    /// 客户端直接读 cpu.collected_at_unix_ms，不用多包一层。
    #[serde(flatten)]
    pub metric: T,
}

fn now_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
pub struct BackgroundCollector<C: Collector> {
    cache: Arc<RwLock<Timestamped<C::Metric>>>,
}

impl<C: Collector> BackgroundCollector<C> {
    /// 启动常驻采集循环，返回一个可以拿去查缓存的句柄。
    pub fn spawn(inner: C, poll_interval: Duration, collect_timeout: Duration) -> Arc<Self> {
        let cache = Arc::new(RwLock::new(Timestamped::<C::Metric>::default()));
        let this = Arc::new(Self {
            cache: cache.clone(),
        });

        let inner = Arc::new(inner);
        let name = inner.name();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(poll_interval);
            // MissedTickBehavior::Delay（默认）就够用：如果某一轮采集本身
            // 超过了 poll_interval，下一次 tick 顺延，不会突然爆发式地
            // 连续触发好几轮采集。
            loop {
                interval.tick().await;

                match tokio::time::timeout(collect_timeout, inner.collect()).await {
                    Ok(Ok(fresh)) => {
                        *(cache.write().unwrap()) = Timestamped {
                            collected_at_unix_ms: now_unix_ms(),
                            metric: fresh,
                        };
                    }
                    Ok(Err(e)) => {
                        warn!(collector = name, error = %e, "采集失败，保留上一次缓存值");
                    }
                    Err(_elapsed) => {
                        warn!(
                            collector = name,
                            timeout_ms = collect_timeout.as_millis(),
                            "采集超时，保留上一次缓存值"
                        );
                    }
                }
            }
        });

        this
    }

    /// 请求路径唯一需要调用的方法：直接读缓存，不做任何采集动作，
    /// 因此耗时是微秒级的锁读取 + clone，不会受任何采集器慢的影响。
    pub async fn get(&self) -> Timestamped<C::Metric> {
        self.cache.read().unwrap().clone()
    }
}
