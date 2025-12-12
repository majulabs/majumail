"use client";

import { useEffect, useCallback, useRef } from "react";

export type SSEEventType = "new_email" | "thread_updated" | "label_changed" | "ping";

export interface SSEEvent {
  type: SSEEventType;
  data?: {
    threadId?: string;
    emailId?: string;
    labelId?: string;
  };
}

export function useSSE(onEvent: (event: SSEEvent) => void) {
  const onEventRef = useRef(onEvent);
  
  // Update ref when callback changes
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;

    const connect = () => {
      try {
        eventSource = new EventSource("/api/sse");

        eventSource.onopen = () => {
          reconnectAttempts = 0; // Reset on successful connection
        };

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data) as SSEEvent;
            // Ignore ping events
            if (data.type !== "ping") {
              onEventRef.current(data);
            }
          } catch (error) {
            console.error("Failed to parse SSE event:", error);
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;

          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
            reconnectAttempts++;
            reconnectTimeout = setTimeout(connect, delay);
          }
        };
      } catch (error) {
        console.error("Failed to create EventSource:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      eventSource?.close();
    };
  }, []);
}