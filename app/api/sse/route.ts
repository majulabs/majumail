import { NextRequest } from "next/server";
import { createSSEStream } from "@/lib/utils/sse";

// In-memory list of response objects to broadcast events (for demo/dev only)
const clients: any[] = [];

export async function GET(request: NextRequest) {
  const { stream, push, close } = createSSEStream();
  clients.push(push);
  request.signal.addEventListener("abort", () => {
    const idx = clients.indexOf(push);
    if (idx !== -1) clients.splice(idx, 1);
    close();
  });
  // Send a ping every 30s to keep connection alive
  const ping = setInterval(() => push({ type: "ping" }), 30000);
  request.signal.addEventListener("abort", () => clearInterval(ping));
  return stream;
}

// Helper to broadcast to all clients
export function broadcastSSE(event: any) {
  for (const push of clients) {
    try { push(event); } catch {}
  }
}
