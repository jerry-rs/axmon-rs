import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">404</h1>
      <p className="text-sm text-muted-foreground">页面不存在。</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        返回概览
      </Link>
    </div>
  );
}
