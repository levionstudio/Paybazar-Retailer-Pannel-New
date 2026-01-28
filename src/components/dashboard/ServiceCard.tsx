import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  icon: LucideIcon;
  description: string;
  stats: {
    label: string;
    value: string;
  }[];
}

export function ServiceCard({
  title,
  icon: Icon,
  description,
  stats,
}: ServiceCardProps) {
  return (
    <Card
      className={cn(
        "finance-card",
        "h-full flex flex-col"
      )}
    >
      {/* HEADER */}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>

          <div>
            <CardTitle className="text-lg">
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="pt-0 flex flex-col flex-1">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-2xl font-bold text-primary">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
