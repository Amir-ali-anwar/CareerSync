import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimplePaginationProps {
  page: number;
  numOfPages: number;
  onPageChange: (page: number) => void;
}

export function SimplePagination({ page, numOfPages, onPageChange }: SimplePaginationProps) {
  if (numOfPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" /> Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {numOfPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= numOfPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
