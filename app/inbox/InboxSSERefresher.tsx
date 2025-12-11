"use client";
import { useInboxSSERefresh } from "@/components/hooks/useInboxSSERefresh";

export function InboxSSERefresher({ refreshInbox }: { refreshInbox: () => void }) {
  useInboxSSERefresh(refreshInbox);
  return null;
}
