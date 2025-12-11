import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: "solid" | "outline";
  size?: "sm" | "md";
  onRemove?: () => void;
  className?: string;
}

export function Badge({
  children,
  color = "#6b7280",
  variant = "solid",
  size = "sm",
  onRemove,
  className,
}: BadgeProps) {
  // Convert hex to RGB for tailwind opacity
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 107, g: 114, b: 128 }; // default gray
  };

  const rgb = hexToRgb(color);
  
  // Calculate luminance to determine text color
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  const textColor = luminance > 0.5 ? "#000000" : "#ffffff";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full",
        sizeClasses[size],
        className
      )}
      style={
        variant === "solid"
          ? { backgroundColor: color, color: textColor }
          : {
              backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
              color: color,
              border: `1px solid ${color}`,
            }
      }
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
