"use client";

import { LABEL_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {LABEL_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110",
            value === color.value && "ring-2 ring-offset-2 ring-gray-400"
          )}
          style={{ backgroundColor: color.value }}
          title={color.name}
        >
          {value === color.value && (
            <Check className="h-4 w-4 text-white drop-shadow-sm" />
          )}
        </button>
      ))}
    </div>
  );
}
