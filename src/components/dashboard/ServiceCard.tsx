import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  icon: LucideIcon;
  status: "active" | "inactive" | "maintenance";
  description: string;
  stats: {
    label: string;
    value: string;
  }[];
  onManage?: () => void;
}

export function ServiceCard({
  title,
  icon: Icon,
  description,
  stats,
  onManage,
}: ServiceCardProps) {
  return (
    <Card
      className={cn(
        "finance-card group",
        "h-full flex flex-col" // 🔥 IMPORTANT
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
        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 mb-4">
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

        {/* BUTTON PUSHED TO BOTTOM */}
        {onManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={onManage}
            className="mt-auto w-full hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Manage Service
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
