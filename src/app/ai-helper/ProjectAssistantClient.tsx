"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatLKR } from "@/lib/utils";

type ChatMessage =
  | { role: "user"; content: string; ts: number }
  | { role: "assistant"; content: string; ts: number; payload?: AssistantPayload };

type AssistantPayload =
  | { mode: "clarify"; questions: string[] }
  | { mode: "suggestions"; items: Suggestion[]; followUp: string };

type Suggestion = {
  productId: number;
  slug: string;
  name: string;
  quantity: number;
  reason: string;
  price: number;
  fromPrice?: boolean;
  salePrice: number | null;
  imageUrl: string | null;
  stock: number;
  similarity?: number;
};

const STORAGE_KEY = "sh_ai_chat_v1";

const STARTERS = [
  "I want to make a baby blanket",
  "School uniform for a 7-year-old",
  "Wedding favor bags — 50 of them",
  "Casual cotton sundress, adult",
];

export default function ProjectAssistantClient() {
  const { add } = useCart();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError("");
    setDraft("");

    const next: ChatMessage[] = [...messages, { role: "user", content, ts: Date.now() }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/project-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      if (data.mode === "clarify") {
        setMessages(m => [
          ...m,
          {
            role: "assistant",
            content: data.message,
            ts: Date.now(),
            payload: { mode: "clarify", questions: data.questions || [] },
          },
        ]);
      } else if (data.mode === "suggestions") {
        setMessages(m => [
          ...m,
          {
            role: "assistant",
            content: data.summary || "",
            ts: Date.now(),
            payload: { mode: "suggestions", items: data.items || [], followUp: data.followUp || "" },
          },
        ]);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([]);
    setError("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function addOneToCart(s: Suggestion) {
    add({
      productId: s.productId,
      name: s.name,
      slug: s.slug,
      price: s.price,
      imageUrl: s.imageUrl,
    }, s.quantity);
  }

  function addAllToCart(items: Suggestion[]) {
    items.forEach(addOneToCart);
  }

  return (
    <div className="rounded-3xl bg-white border border-saffron-200/60 shadow-lg overflow-hidden flex flex-col h-[75vh] min-h-[500px] max-h-[820px]">
      <div className="px-5 py-3 border-b border-saffron-200/40 bg-ivory/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center h-8 w-8 rounded-xl bg-ink text-cream text-sm">✨</span>
          <div>
            <p className="font-display font-semibold text-ink text-sm leading-tight">AI Project Helper</p>
            <p className="text-[11px] text-ink-mute leading-tight">Powered by GPT-4o</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="text-xs font-semibold text-ink-mute hover:text-saffron-700 transition-colors">
            New chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-cream/30">
        {messages.length === 0 && <WelcomeState onPick={send} />}

        {messages.map((m, i) => (
          <MessageBubble
            key={m.ts + "-" + i}
            message={m}
            onAddOne={addOneToCart}
            onAddAll={addAllToCart}
          />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-ink-mute pl-2">
            <span className="inline-block w-2 h-2 rounded-full bg-saffron-500 animate-bounce" />
            <span className="inline-block w-2 h-2 rounded-full bg-saffron-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
            <span className="inline-block w-2 h-2 rounded-full bg-saffron-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
            <span className="text-xs italic font-display ml-1">Threading the needle…</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(draft); }}
        className="border-t border-saffron-200/40 bg-white p-3 flex gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={messages.length === 0 ? "Tell me what you're making…" : "Ask a follow-up, or refine…"}
          disabled={loading}
          maxLength={500}
          className="flex-1 px-4 py-3 rounded-xl border border-saffron-200 bg-cream/40 text-ink placeholder:text-ink-mute focus:outline-none focus:border-saffron-500 focus:bg-white transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="rounded-xl bg-ink hover:bg-ink-soft text-cream font-bold px-5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}

function WelcomeState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="text-center py-6 px-4">
      <div className="inline-grid place-items-center h-14 w-14 rounded-2xl bg-saffron-100 text-3xl mb-3 stitched">🧵</div>
      <h2 className="font-display font-semibold text-2xl text-ink mb-2">What are you making?</h2>
      <p className="text-ink-mute text-sm mb-6 max-w-md mx-auto">
        Describe your project — I&apos;ll pick the right threads, trims and tools from our catalog.
      </p>
      <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
        {STARTERS.map(s => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left p-3 rounded-xl border border-saffron-200 bg-white hover:border-saffron-400 hover:shadow-sm transition-all text-sm text-ink"
          >
            <span className="text-saffron-600 mr-2">↗</span>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onAddOne,
  onAddAll,
}: {
  message: ChatMessage;
  onAddOne: (s: Suggestion) => void;
  onAddAll: (s: Suggestion[]) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-md bg-ink text-cream text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const payload = message.payload;
  return (
    <div className="flex flex-col items-start gap-2 max-w-full">
      {message.content && (
        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-md bg-saffron-50 text-ink border border-saffron-200/50 text-sm leading-relaxed">
          {message.content}
        </div>
      )}

      {payload?.mode === "clarify" && (
        <div className="w-full max-w-[90%] pl-1 space-y-2">
          <ol className="space-y-1.5 text-sm text-ink list-none">
            {payload.questions.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-saffron-100 text-saffron-700 text-[11px] font-bold">{i + 1}</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-ink-mute italic pl-7">Type your answer below — you can answer all of them in one message.</p>
        </div>
      )}

      {payload?.mode === "suggestions" && payload.items.length > 0 && (
        <div className="w-full space-y-2">
          {payload.items.map(item => (
            <SuggestionCard key={item.productId} item={item} onAdd={() => onAddOne(item)} />
          ))}
          <div className="flex items-center justify-between gap-3 px-2 pt-1">
            <p className="text-xs text-ink-mute italic">{payload.followUp}</p>
            <button
              onClick={() => onAddAll(payload.items)}
              className="shrink-0 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-bold px-3 py-2 shadow-sm transition-colors"
            >
              Add all {payload.items.length} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ item, onAdd }: { item: Suggestion; onAdd: () => void }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white border border-saffron-200/60 hover:border-saffron-400 transition-colors">
      <Link href={`/product/${item.slug}`} className="shrink-0">
        <div className="w-16 h-16 rounded-lg bg-brand-50 overflow-hidden">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-2xl">🧵</div>
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/product/${item.slug}`} className="font-display font-semibold text-sm text-ink hover:text-saffron-700 line-clamp-1">
            {item.name}
          </Link>
          {item.similarity != null && (
            <span className="shrink-0 text-[10px] font-bold text-saffron-700 bg-saffron-50 px-1.5 py-0.5 rounded">
              {Math.round(item.similarity * 100)}% match
            </span>
          )}
        </div>
        <p className="text-xs text-ink-mute mt-0.5 line-clamp-2">{item.reason}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-bold text-saffron-700">
            {item.price > 0
              ? <>{item.fromPrice && <span className="text-xs text-ink-mute font-normal mr-1">From</span>}{formatLKR(item.price)} × {item.quantity}</>
              : <span className="text-ink-mute font-normal italic">See options</span>}
          </span>
          <button
            onClick={onAdd}
            disabled={item.price <= 0}
            className="text-xs font-bold text-ink hover:text-saffron-700 disabled:text-ink-mute/40 disabled:cursor-not-allowed transition-colors"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}
