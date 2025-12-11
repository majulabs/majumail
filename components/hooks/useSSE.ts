import { useEffect } from "react";

export function useSSE(onEvent: (event: any) => void) {
  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch {}
    };
    return () => es.close();
  }, [onEvent]);
}
