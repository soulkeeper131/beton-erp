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
    if (open) inputRef.current?.focus();
  }, [open]);

  // Block body scroll when chat is open on mobile
  useEffect(() => {
    if (open && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
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
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-5 md:right-5 z-40 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center text-xl md:text-2xl"
          title="AI Асистент"
        >
          💬
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
          />

          <div className={cn(
            "fixed z-50 flex flex-col overflow-hidden border bg-card shadow-2xl",
            // Mobile: full screen
            "inset-0 rounded-none",
            // Desktop: floating panel
            "md:inset-auto md:bottom-5 md:right-5 md:w-[380px] md:h-[520px] md:max-w-[calc(100vw-2rem)] md:max-h-[calc(100vh-5rem)] md:rounded-xl",
          )}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl">🤖</span>
                <div>
                  <div className="font-semibold text-sm">AI Асистент</div>
                  <div className="text-xs text-muted-foreground">Beton ERP</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-1 rounded-md hover:bg-muted active:bg-muted/80 transition-colors text-muted-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8 md:py-12 px-4">
                  <div className="text-3xl md:text-4xl mb-3">🤖</div>
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
                        className="text-xs p-2.5 rounded-lg border hover:bg-muted active:bg-muted/80 transition-colors text-left"
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
                    <span className="text-base md:text-lg shrink-0 mt-0.5">🤖</span>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm max-w-[82%] md:max-w-[85%] whitespace-pre-wrap break-words",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : msg.role === "system"
                        ? "bg-muted text-muted-foreground text-xs"
                        : "bg-muted"
                    )}
                  >
                    <div dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/`([^`]+)`/g, "<code>$1</code>")
                        .replace(/```json\n([\s\S]*?)```/g, "<pre class='bg-muted-foreground/10 p-2 rounded text-xs overflow-x-auto'>$1</pre>")
                    }} />
                    {msg.needsConfirmation && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => sendMessage("Да, потвърждавам")}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 active:scale-95 transition-transform"
                        >✅ Потвърди</button>
                        <button
                          onClick={() => setMessages(prev => [...prev, { role: "assistant", content: "❌ Отказано. Какво друго мога да направя?" }])}
                          className="px-3 py-1.5 bg-muted rounded-md text-xs hover:bg-muted/80 active:scale-95 transition-transform"
                        >❌ Откажи</button>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <span className="text-base md:text-lg shrink-0 mt-0.5">👤</span>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 items-center text-muted-foreground pl-8">
                  <span className="text-base md:text-lg">🤖</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: "0ms"}} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: "150ms"}} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: "300ms"}} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3 shrink-0 bg-background">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Попитай нещо..."
                  disabled={loading}
                  className="flex-1 h-10 md:h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="h-10 md:h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-95 shrink-0"
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
