import { Badge } from "@/components/ui/Badge";
import type { Label } from "@/lib/db/schema";

interface LabelBadgeProps {
  label: Label & {
    appliedBy?: string | null;
    confidence?: number | null;
  };
  onRemove?: () => void;
  showConfidence?: boolean;
  size?: "sm" | "md";
}

export function LabelBadge({
  label,
  onRemove,
  showConfidence = false,
  size = "sm",
}: LabelBadgeProps) {
  return (
    <Badge
      color={label.color}
      onRemove={onRemove}
      size={size}
    >
      {label.name}
      {showConfidence && label.appliedBy === "ai" && label.confidence && (
        <span className="opacity-75 ml-1">({label.confidence}%)</span>
      )}
    </Badge>
  );
}
