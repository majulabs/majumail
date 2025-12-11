import { useSSE } from "@/components/hooks/useSSE";

export function useInboxSSERefresh(refreshInbox: () => void) {
  useSSE((event) => {
    if (event.type === "new_email") {
      refreshInbox();
    }
  });
}
