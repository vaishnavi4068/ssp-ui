import { getRuntimeConfig } from './config';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

function assistantBase(): string {
  const cfg = getRuntimeConfig();
  const root = (cfg.API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
  return `${root}/v1/assistant`;
}

export async function createAssistantConversation(): Promise<string> {
  const res = await fetch(`${assistantBase()}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ surface: 'storefront' }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      res.status === 503
        ? 'Sidekick is off on the API. Set SSP_ASSISTANT_ENABLED and SSP_ASSISTANT_API_KEY in local-dev/.env and restart ssp-cp.'
        : `conversation failed (${res.status}): ${detail}`
    );
  }
  const data = (await res.json()) as { conversation_id?: string };
  if (!data.conversation_id) {
    throw new Error('missing conversation_id');
  }
  return data.conversation_id;
}

/** Parses SSE data lines from POST .../messages */
export async function sendAssistantMessage(conversationId: string, text: string): Promise<string> {
  const res = await fetch(`${assistantBase()}/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`message failed (${res.status}): ${detail}`);
  }
  const raw = await res.text();
  let answer = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) {
      continue;
    }
    try {
      const payload = JSON.parse(line.slice(6)) as { event?: string; text?: string };
      if (payload.event === 'assistant_text' && payload.text) {
        answer = payload.text;
      }
    } catch {
      // ignore partial lines
    }
  }
  if (!answer) {
    throw new Error('empty assistant response');
  }
  return answer;
}
