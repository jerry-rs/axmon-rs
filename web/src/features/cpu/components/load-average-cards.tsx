import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LoadAverageCardsProps {
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
}

export function LoadAverageCards({ loadAvg1, loadAvg5, loadAvg15 }: LoadAverageCardsProps) {
  const items = [
    { label: "1m", value: loadAvg1 },
    { label: "5m", value: loadAvg5 },
    { label: "15m", value: loadAvg15 },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">
              Load avg · {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{item.value.toFixed(2)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
