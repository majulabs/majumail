import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { getInitials } from "@/lib/utils/format";

interface AvatarProps {
  name?: string | null;
  email?: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({
  name,
  email,
  image,
  size = "md",
  className,
}: AvatarProps) {
  const initials = getInitials(name || email);

  // Generate a consistent color based on the email/name
  const colorSeed = (email || name || "").split("").reduce((acc, char) => {
    return char.charCodeAt(0) + acc;
  }, 0);

  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
  ];

  const bgColor = colors[colorSeed % colors.length];

  const sizePixels = size === "sm" ? 32 : size === "md" ? 40 : 48;

  if (image) {
    return (
      <Image
        src={image}
        alt={name || email || "Avatar"}
        width={sizePixels}
        height={sizePixels}
        className={cn(
          "rounded-full object-cover",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium",
        bgColor,
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
