import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  change: {
    type: "positive" | "negative";
  };
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  description,
}: StatsCardProps) {
  const TrendIcon = change.type === "positive" ? TrendingUp : TrendingDown;

  return (
    <Card className="finance-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {description && (
            <span className="text-xs text-muted-foreground ml-1">
              {description}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
