import type { Response } from 'express';

/** A Server-Sent Events channel over an Express response. */
export interface EventStream<T> {
  send(event: T): void;
  /** True once the client has gone away. */
  readonly closed: boolean;
  end(): void;
}

/** Sends the SSE headers right away (no buffering by proxies) and returns the channel. */
export function openEventStream<T>(res: Response): EventStream<T> {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  let closed = false;
  res.on('close', () => {
    closed = true;
  });

  return {
    send: (event) => res.write(`data: ${JSON.stringify(event)}\n\n`),
    get closed() {
      return closed;
    },
    end: () => res.end(),
  };
}
