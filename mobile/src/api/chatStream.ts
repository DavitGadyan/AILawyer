import { fetch as expoFetch } from 'expo/fetch';

import { API_URL } from './config';
import { getItem, KEYS } from './storage';
import type { Jurisdiction, Lawyer, Practice } from './types';

export interface StreamHandlers {
  onSession?: (sessionId: number) => void;
  onDelta?: (text: string) => void;
  onLawyers?: (lawyers: Lawyer[]) => void;
  onDone?: (payload: { text: string; title: string }) => void;
  onError?: (message: string) => void;
}

export interface StreamRequest {
  message: string;
  sessionId?: number | null;
  practice: Practice;
  jurisdiction: Jurisdiction;
  locale: string;
  wantLawyers?: boolean;
}

/**
 * POST to /chat/stream and dispatch server-sent events as they arrive.
 *
 * Uses `expo/fetch` rather than the global fetch: React Native's built-in
 * implementation buffers the whole body, which would defeat streaming on device.
 * The same call streams correctly on web.
 */
export async function streamChat(
  req: StreamRequest,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = await getItem(KEYS.token);

  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: req.message,
        session_id: req.sessionId ?? null,
        practice: req.practice,
        jurisdiction: req.jurisdiction,
        locale: req.locale,
        want_lawyers: req.wantLawyers ?? true,
      }),
      signal,
    });
  } catch {
    handlers.onError?.('network');
    return;
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* keep generic */
    }
    handlers.onError?.(detail);
    return;
  }

  const body = res.body;
  if (!body) {
    handlers.onError?.('The server returned an empty stream.');
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        dispatch(frame, handlers);
        boundary = buffer.indexOf('\n\n');
      }
    }
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') {
      handlers.onError?.('The connection was interrupted.');
    }
  } finally {
    reader.releaseLock?.();
  }
}

function dispatch(frame: string, handlers: StreamHandlers): void {
  for (const line of frame.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const raw = line.slice(5).trim();
    if (!raw) continue;

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw);
    } catch {
      continue;
    }

    switch (event.type) {
      case 'session':
        handlers.onSession?.(event.session_id as number);
        break;
      case 'delta':
        handlers.onDelta?.(event.text as string);
        break;
      case 'lawyers':
        handlers.onLawyers?.(event.lawyers as Lawyer[]);
        break;
      case 'done':
        handlers.onDone?.({
          text: event.text as string,
          title: event.title as string,
        });
        break;
      case 'error':
        handlers.onError?.(event.message as string);
        break;
    }
  }
}
