"use client";
import { useRouter } from "next/navigation";
import { useSSE } from "@/components/hooks/useSSE";

export function ClientSSERefresher() {
  const router = useRouter();
  useSSE((event) => {
    if (event.type === "new_email") {
      router.refresh();
    }
  });
  return null;
}
