import React, { useCallback, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import {
  createAssistantConversation,
  sendAssistantMessage,
  type ChatMessage,
} from '../lib/assistantClient';

let conversationPromise: Promise<string> | null = null;

async function ensureConversation(): Promise<string> {
  if (!conversationPromise) {
    conversationPromise = createAssistantConversation();
  }
  return conversationPromise;
}

export function AssistantSidekick() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'I am the SPP Sidekick (local). Ask about GCS bucket naming, labels, or guardrails. I do not submit or approve requests for you.',
    },
  ]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) {
      return;
    }
    setInput('');
    setError(null);
    setBusy(true);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const conv = await ensureConversation();
      const answer = await sendAssistantMessage(conv, text);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [input, busy]);

  return (
    <>
      {!open && (
        <button
          type="button"
          data-testid="sidekick-launcher"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#008060] text-white shadow-lg hover:bg-[#006e52] cursor-pointer"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Sidekick</span>
        </button>
      )}
      {open && (
        <div
          data-testid="sidekick-panel"
          className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(520px,calc(100vh-6rem))] flex flex-col rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#141719] shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-neutral-700">
            <h2 className="text-sm font-bold">SPP Sidekick (local LLM)</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-3 py-2 ${
                  m.role === 'user'
                    ? 'ml-8 bg-[#008060]/15 text-[#006e52] dark:text-emerald-200'
                    : 'mr-4 bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-100'
                }`}
              >
                {m.text}
              </div>
            ))}
            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg p-2">
                {error}
              </div>
            )}
          </div>
          <form
            className="p-3 border-t border-slate-200 dark:border-neutral-700 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void onSend();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about GCS buckets…"
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-600 bg-transparent focus:outline-none focus:border-[#008060]"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="p-2 rounded-xl bg-[#008060] text-white disabled:opacity-40 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
