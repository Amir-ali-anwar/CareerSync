import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function InteractiveListCard({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      size="sm"
      className={cn(
        "transition-colors hover:border-primary/40 hover:bg-surface",
        className
      )}
      {...props}
    />
  );
}
