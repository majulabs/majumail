import { useEffect } from "react";
import { useSSE } from "@/components/hooks/useSSE";

export function useSidebarSSERefresh(refreshSidebar: () => void) {
  useSSE((event) => {
    if (event.type === "new_email") {
      refreshSidebar();
    }
  });
  useEffect(() => {
    // Optionally, refresh on mount
    refreshSidebar();
  }, [refreshSidebar]);
}
