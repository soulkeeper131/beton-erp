"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  needsConfirmation?: boolean;
  pendingAction?: { tool: string; args: any };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Lock body scroll on mobile when chat is open
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };
  }, [open]);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `❌ ${err.error || "Грешка"}`
        }]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSessionId(data.sessionId);

      if (data.needsConfirmation) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.response,
          needsConfirmation: true,
          pendingAction: data.pendingAction,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.response,
        }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Грешка при свързване: ${e.message}`
      }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating trigger — safe area aware */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center text-2xl"
          style={{
            right: "max(16px, env(safe-area-inset-right, 16px))",
            bottom: "max(20px, env(safe-area-inset-bottom, 20px))",
          }}
          title="AI Асистент"
        >
          💬
        </button>
      )}

      {/* Chat panel — fullscreen on mobile */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            className="fixed z-[60] flex flex-col overflow-hidden bg-card shadow-2xl"
            style={{
              // Mobile: full screen with safe areas
              top: "env(safe-area-inset-top, 0px)",
              left: "env(safe-area-inset-left, 0px)",
              right: "env(safe-area-inset-right, 0px)",
              bottom: "env(safe-area-inset-bottom, 0px)",
              height: "100dvh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0"
              style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🤖</span>
                <div>
                  <div className="font-semibold text-sm">AI Асистент</div>
                  <div className="text-[11px] text-muted-foreground">Beton ERP</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-muted active:bg-muted/70 transition-colors text-muted-foreground -mr-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Messages — scrollable, elastic-friendly */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8 px-4">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-sm font-medium mb-2">Здравейте! Аз съм AI асистентът на Beton ERP.</p>
                  <p className="text-xs mb-4">Мога да търся, създавам и управлявам всичко в системата.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Покажи каталога",
                      "Статистика",
                      "Търси клиент",
                      "Нова оферта"
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-xs min-h-[44px] p-2.5 rounded-xl border border-border/60 hover:bg-muted active:bg-muted/80 transition-colors text-left"
                      >{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <span className="text-lg shrink-0 mt-0.5">🤖</span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed max-w-[85%] whitespace-pre-wrap break-words",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : msg.role === "system"
                        ? "bg-muted text-muted-foreground text-xs"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <div dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/`([^`]+)`/g, "<code style='background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;font-size:13px'>$1</code>")
                        .replace(/```json\n([\s\S]*?)```/g, "<pre style='background:rgba(0,0,0,0.04);padding:8px;border-radius:6px;font-size:12px;overflow-x:auto;margin:4px 0'>$1</pre>")
                    }} />
                    {msg.needsConfirmation && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => sendMessage("Да, потвърждавам")}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 active:scale-95 transition-transform min-h-[40px]"
                        >✅ Потвърди</button>
                        <button
                          onClick={() => setMessages(prev => [...prev, { role: "assistant", content: "❌ Отказано. Какво друго мога да направя?" }])}
                          className="px-4 py-2 bg-muted rounded-xl text-sm hover:bg-muted/80 active:scale-95 transition-transform min-h-[40px]"
                        >❌ Откажи</button>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <span className="text-lg shrink-0 mt-0.5">👤</span>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 items-center text-muted-foreground pl-9">
                  <span className="text-lg">🤖</span>
                  <div className="flex gap-1 py-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: "0ms"}} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: "150ms"}} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: "300ms"}} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area — fixed at bottom, safe-area aware */}
            <div
              className="border-t bg-background shrink-0 px-3 pt-3"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
            >
              <div className="flex gap-2 items-end">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Попитай нещо..."
                  disabled={loading}
                  enterKeyHint="send"
                  className="flex-1 min-h-[44px] rounded-xl border border-input bg-background px-4 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  style={{ fontSize: "16px" }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors active:scale-95 shrink-0 flex items-center justify-center text-lg"
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
