import { NextResponse } from "next/server";

export function createSSEStream() {
  let controller: ReadableStreamDefaultController<any>;
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      controller.close();
    },
  });
  function push(event: any) {
    controller.enqueue(
      `data: ${JSON.stringify(event)}\n\n`
    );
  }
  function close() {
    controller.close();
  }
  return {
    stream: new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }),
    push,
    close,
  };
}
