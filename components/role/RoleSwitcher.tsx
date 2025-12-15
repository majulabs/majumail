"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRole } from "@/components/providers/RoleProvider";
import type { TeamMember } from "@/lib/types/role";

interface RoleSwitcherProps {
  className?: string;
  compact?: boolean;
}

function MemberAvatar({ member, size = "md" }: { member: TeamMember; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";
  
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0",
        sizeClasses
      )}
      style={{ backgroundColor: member.avatarColor }}
    >
      {member.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function RoleSwitcher({ className, compact = false }: RoleSwitcherProps) {
  const { activeRole, activeRoleId, switchRole, teamMembers, otherMember } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleSwitch = (memberId: string) => {
    switchRole(memberId as "marcel" | "julien");
    setIsOpen(false);
  };

  // Quick switch mode (compact) - just shows avatar and switches on click
  if (compact) {
    return (
      <button
        onClick={() => handleSwitch(otherMember.id)}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg transition-colors",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "text-gray-600 dark:text-gray-400",
          className
        )}
        title={`Switch to ${otherMember.name}`}
      >
        <Users className="h-4 w-4" />
        <MemberAvatar member={activeRole} size="sm" />
      </button>
    );
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors",
          "bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20",
          "hover:from-blue-100 hover:to-violet-100 dark:hover:from-blue-900/30 dark:hover:to-violet-900/30",
          "border border-blue-200/50 dark:border-blue-700/50"
        )}
      >
        <MemberAvatar member={activeRole} />
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Viewing as {activeRole.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {activeRole.mailboxAddress}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Switch Role
            </p>
          </div>
          {teamMembers.map((member) => {
            const isActive = member.id === activeRoleId;
            return (
              <button
                key={member.id}
                onClick={() => handleSwitch(member.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-3 transition-colors",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
              >
                <MemberAvatar member={member} />
                <div className="flex-1 text-left min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-gray-100"
                    )}
                  >
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {member.mailboxAddress}
                  </p>
                </div>
                {isActive && (
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}