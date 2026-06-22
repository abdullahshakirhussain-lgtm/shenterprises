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
  // Local UI state — not from server, just for instant thumb feedback
  suggestionId?: number;
  thumb?: "up" | "down";
};

const STORAGE_KEY = "sh_ai_chat_v1";
const BROWSER_ID_KEY = "sh_browser_id";
const SESSION_ID_KEY = "sh_ai_session_id";

function getOrCreateBrowserId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(BROWSER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(BROWSER_ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [browserId, setBrowserId] = useState<string>("");
  const [rated, setRated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBrowserId(getOrCreateBrowserId());
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
      const sid = localStorage.getItem(SESSION_ID_KEY);
      if (sid) setSessionId(sid);
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
          sessionId,
          browserId,
        }),
      });
      const data = await res.json();
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        try { localStorage.setItem(SESSION_ID_KEY, data.sessionId); } catch {}
      }
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
    setSessionId(null);
    setRated(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_ID_KEY);
    } catch {}
  }

  function addOneToCart(s: Suggestion) {
    add({
      productId: s.productId,
      name: s.name,
      slug: s.slug,
      price: s.price,
      imageUrl: s.imageUrl,
    }, s.quantity);
    // Tell the server this AI suggestion led to a cart add — silent best-effort
    if (sessionId && s.price > 0) {
      fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, productId: s.productId, addedToCart: true }),
      }).catch(() => {});
    }
  }

  function addAllToCart(items: Suggestion[]) {
    items.forEach(addOneToCart);
  }

  function rateSession(score: number, comment?: string) {
    if (!sessionId || rated) return;
    setRated(true);
    fetch("/api/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ratingScore: score, ratingComment: comment || null }),
    }).catch(() => {});
  }

  // Has the assistant returned at least one suggestions message? If so, show rating widget
  const hasAnySuggestions = messages.some(
    m => m.role === "assistant" && m.payload?.mode === "suggestions"
  );

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
            onThumb={(suggestionId, up) => {
              if (!sessionId || !suggestionId) return;
              fetch("/api/ai/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, suggestionId, thumbsUp: up }),
              }).catch(() => {});
            }}
          />
        ))}

        {/* Rating widget — appears once the assistant has produced suggestions */}
        {hasAnySuggestions && !loading && (
          <RatingWidget rated={rated} onRate={rateSession} />
        )}

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
        className="border-t border-saffron-200/40 bg-white p-3"
      >
        <div className="flex gap-2">
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
        </div>
        <p className="text-[10px] text-ink-mute text-center mt-2 italic">
          Conversations help us improve — they&apos;re never shared.
        </p>
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
  onThumb,
}: {
  message: ChatMessage;
  onAddOne: (s: Suggestion) => void;
  onAddAll: (s: Suggestion[]) => void;
  onThumb: (suggestionId: number | undefined, up: boolean) => void;
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
            <SuggestionCard
              key={item.suggestionId ?? item.productId}
              item={item}
              onAdd={() => onAddOne(item)}
              onThumb={(up) => onThumb(item.suggestionId, up)}
            />
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

function SuggestionCard({
  item,
  onAdd,
  onThumb,
}: {
  item: Suggestion;
  onAdd: () => void;
  onThumb: (up: boolean) => void;
}) {
  const [thumb, setThumb] = useState<"up" | "down" | null>(null);

  function handleThumb(up: boolean) {
    // Lock once rated — keep UI honest
    if (thumb) return;
    setThumb(up ? "up" : "down");
    onThumb(up);
  }

  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white border border-saffron-200/60 hover:border-saffron-400 transition-colors relative">
      {/* Thumb buttons — small, top-right */}
      {item.suggestionId && (
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => handleThumb(true)}
            disabled={!!thumb}
            className={`w-6 h-6 grid place-items-center rounded-full text-xs transition-all ${
              thumb === "up"
                ? "bg-thread-teal-500 text-white"
                : thumb === "down"
                  ? "opacity-30 cursor-not-allowed"
                  : "bg-white border border-saffron-200 text-ink-mute hover:bg-thread-teal-50 hover:border-thread-teal-500"
            }`}
            title="Helpful"
            aria-label="Mark suggestion as helpful"
          >
            👍
          </button>
          <button
            onClick={() => handleThumb(false)}
            disabled={!!thumb}
            className={`w-6 h-6 grid place-items-center rounded-full text-xs transition-all ${
              thumb === "down"
                ? "bg-thread-maple-500 text-white"
                : thumb === "up"
                  ? "opacity-30 cursor-not-allowed"
                  : "bg-white border border-saffron-200 text-ink-mute hover:bg-thread-maple-50 hover:border-thread-maple-500"
            }`}
            title="Not useful"
            aria-label="Mark suggestion as not useful"
          >
            👎
          </button>
        </div>
      )}

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
      <div className="flex-1 min-w-0 pr-14">
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

function RatingWidget({ rated, onRate }: { rated: boolean; onRate: (score: number, comment?: string) => void }) {
  const [score, setScore] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);

  if (rated) {
    return (
      <div className="mx-auto mt-4 max-w-md text-center text-xs text-ink-mute italic">
        ✓ Thanks for the feedback — it helps us improve.
      </div>
    );
  }

  function pickStar(n: number) {
    setScore(n);
    setShowCommentBox(true);
  }

  function submit() {
    if (score == null) return;
    onRate(score, comment.trim() || undefined);
  }

  return (
    <div className="mt-4 mx-auto max-w-md p-4 rounded-2xl bg-ivory/60 border border-saffron-200/60">
      <p className="text-sm font-display font-semibold text-ink text-center mb-2">How helpful was this?</p>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => pickStar(n)}
            className="text-2xl transition-transform hover:scale-110"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <span className={n <= (hover || (score ?? 0)) ? "text-saffron-500" : "text-saffron-200"}>★</span>
          </button>
        ))}
      </div>
      {showCommentBox && (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Anything else? (optional)"
            maxLength={500}
            rows={2}
            className="w-full text-sm rounded-lg border border-saffron-200 bg-white px-3 py-2 focus:outline-none focus:border-saffron-500 resize-none"
          />
          <button
            onClick={submit}
            className="w-full rounded-lg bg-ink hover:bg-ink-soft text-cream text-sm font-bold py-2 transition-colors"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
