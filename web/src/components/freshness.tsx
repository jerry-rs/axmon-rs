interface FreshnessProps {
  collectedAtUnixMs: number;
  /**
   * 采集时间超过这个毫秒数还没更新就标黄，提示后端采集循环可能卡住了。
   * 按各采集器的轮询节奏传（一般是 poll_interval 的 3 倍左右）；
   * 传 0 或不传表示不需要 stale 检测。
   */
  staleAfterMs?: number;
}

/**
 * 显示指标的采集时间（collectedAtUnixMs，"什么时候采到的"而不是
 * "什么时候收到的"）。0 是后端"还没采到首轮"的哨兵。
 */
export function Freshness({ collectedAtUnixMs, staleAfterMs = 0 }: FreshnessProps) {
  if (collectedAtUnixMs === 0) {
    return <p className="text-xs text-muted-foreground">Waiting for first sample…</p>;
  }
  const stale = staleAfterMs > 0 && Date.now() - collectedAtUnixMs > staleAfterMs;
  const time = new Date(collectedAtUnixMs).toLocaleTimeString();
  return (
    <p className={stale ? "text-xs text-amber-500" : "text-xs text-muted-foreground"}>
      Collected at {time}
      {stale && " (possibly stale)"}
    </p>
  );
}
