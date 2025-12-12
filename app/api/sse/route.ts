import { NextRequest } from "next/server";

interface SSEClient {
  push: (event: SSEEventPayload) => void;
  close: () => void;
}

interface SSEEventPayload {
  type: "new_email" | "thread_updated" | "label_changed" | "ping";
  data?: {
    threadId?: string;
    emailId?: string;
    labelId?: string;
  };
}

// In-memory list of connected clients
const clients: Set<(event: SSEEventPayload) => void> = new Set();

function createSSEStream(): {
  stream: Response;
  push: (event: SSEEventPayload) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      controller = null;
    },
  });

  const push = (event: SSEEventPayload) => {
    if (controller) {
      try {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      } catch {
        // Stream might be closed
      }
    }
  };

  const close = () => {
    if (controller) {
      try {
        controller.close();
      } catch {
        // Already closed
      }
      controller = null;
    }
  };

  return {
    stream: new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    }),
    push,
    close,
  };
}

export async function GET(request: NextRequest) {
  const { stream, push, close } = createSSEStream();

  // Add client to the set
  clients.add(push);

  // Handle client disconnect
  request.signal.addEventListener("abort", () => {
    clients.delete(push);
    close();
  });

  // Send a ping every 30s to keep connection alive
  const pingInterval = setInterval(() => {
    push({ type: "ping" });
  }, 30000);

  request.signal.addEventListener("abort", () => {
    clearInterval(pingInterval);
  });

  return stream;
}

// Helper to broadcast to all connected clients
export function broadcastSSE(event: SSEEventPayload) {
  for (const push of clients) {
    try {
      push(event);
    } catch {
      // Client might have disconnected
      clients.delete(push);
    }
  }
}