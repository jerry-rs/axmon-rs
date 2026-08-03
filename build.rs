use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;

const FRONTEND_DIR: &'static str = "web";

/// cargo build 时顺带构建前端：按需 pnpm install + pnpm build，产物在 web/dist。
/// 设 AXMON_SKIP_FRONTEND_BUILD=1 可跳过（纯后端迭代时用），PNPM 可覆盖 pnpm 路径。
fn main() {
    // 只监听源码类文件；监听 dist / node_modules 会让构建自我触发、无限重跑。
    for path in [
        "index.html",
        "package.json",
        "pnpm-lock.yaml",
        "vite.config.ts",
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.node.json",
    ] {
        println!("cargo:rerun-if-changed={FRONTEND_DIR}/{path}");
    }
    for dir in ["src", "public"] {
        watch_dir(&Path::new(FRONTEND_DIR).join(dir));
    }
    println!("cargo:rerun-if-env-changed=AXMON_SKIP_FRONTEND_BUILD");
    println!("cargo:rerun-if-env-changed=PNPM");

    if env::var_os("AXMON_SKIP_FRONTEND_BUILD").is_some() {
        return;
    }

    let frontend = Path::new(FRONTEND_DIR);
    assert!(
        frontend.is_dir(),
        "frontend directory '{FRONTEND_DIR}' not found"
    );

    let pnpm = env::var("PNPM").unwrap_or_else(|_| "pnpm".into());

    if needs_install(frontend) {
        run(&pnpm, &["install", "--frozen-lockfile"], frontend);
    }
    run(&pnpm, &["build"], frontend);
}

/// 递归逐文件监听目录：文件条目感知内容修改，目录条目兜底感知
/// 文件增删（此时目录 mtime 会变）。cargo 基于 mtime 跟踪，
/// 文件时间戳被人为改旧时仍会漏检，这是 mtime 机制的固有限制。
fn watch_dir(dir: &Path) {
    println!("cargo:rerun-if-changed={}", dir.display());
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            watch_dir(&path);
        } else {
            println!("cargo:rerun-if-changed={}", path.display());
        }
    }
}

/// node_modules 缺失或 lockfile 比上次安装新时才 install，
/// 避免每次 cargo build 都白跑一遍 pnpm install。
fn needs_install(frontend: &Path) -> bool {
    let installed = frontend
        .join("node_modules/.modules.yaml")
        .metadata()
        .and_then(|m| m.modified());
    let Ok(installed) = installed else {
        return true;
    };
    match frontend.join("pnpm-lock.yaml").metadata().and_then(|m| m.modified()) {
        Ok(locked) => locked > installed,
        Err(_) => true,
    }
}

fn run(program: &str, args: &[&str], dir: &Path) {
    let cmdline = format!("{program} {}", args.join(" "));
    let status = Command::new(program)
        .args(args)
        .current_dir(dir)
        .status()
        .unwrap_or_else(|e| panic!("failed to spawn `{cmdline}`: {e}. Is pnpm on PATH?"));
    assert!(status.success(), "`{cmdline}` failed with {status}");
}
