import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";
import ProductCard from "./ProductCard";
import ChatBotIcon from "./ChatBotIcon";

const SUPPORT_PHONE_E164 = "+919116546255";
const SUPPORT_WHATSAPP = "919116546255";

const buildWhatsAppLink = (text) =>
  `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text || "Hello! I need assistance.")}`;

const CHAT_UNAVAILABLE_WHATSAPP_TEXT =
  "Our chat assistant is briefly unavailable. Tap below to continue on WhatsApp — our team will help you right away.";

function looksLikeModelUnavailablePayload(text) {
  const s = String(text || "").trim();
  if (!s.startsWith("{")) return false;
  return (
    /"code"\s*:\s*503/.test(s) ||
    /"status"\s*:\s*"UNAVAILABLE"/i.test(s) ||
    /high demand/i.test(s) ||
    /UNAVAILABLE/i.test(s)
  );
}

const WELCOME_MESSAGE = {
  id: "welcome",
  text: `👋 Hi! I’m your customer support assistant for SK Fruits.\nHow can I help you today?`,
  sender: "bot",
  timestamp: new Date(),
  quickOptions: [
    { label: "Delivery timing", value: "What are your delivery timings?" },
    { label: "Pricing", value: "Can you share pricing details?" },
    { label: "Availability", value: "Is this product available?" },
    { label: "Payment options", value: "What payment options are available?" },
    { label: "Talk to team", value: "I want to talk to customer support" },
    { label: "✍️ Type your question", value: "" },
  ],
};

export default function ChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const conversationRef = useRef([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    document.body.classList.toggle("chat-open", isOpen);
    return () => document.body.classList.remove("chat-open");
  }, [isOpen]);

  const toggleChat = () => {
    setHasInteracted(true);
    setIsOpen((open) => !open);
  };

  const sendToApi = async (userText) => {
    if (!userText?.trim()) return;

    const userMsg = {
      id: Date.now(),
      text: userText.trim(),
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    conversationRef.current = [
      ...conversationRef.current,
      { role: "user", content: userText.trim() },
    ];
    setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationRef.current }),
      });
      const rawBody = await res.text();
      let data = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const errObj = data?.error;
        const errText =
          typeof errObj === "string"
            ? errObj
            : typeof errObj?.message === "string"
              ? errObj.message
              : typeof data?.message === "string"
                ? data.message
                : "";
        const errLower = errText.toLowerCase();
        const isQuota =
          res.status === 429 ||
          errObj?.code === 429 ||
          errLower.includes("quota") ||
          errLower.includes("billing");
        if (isQuota) {
          setIsOpen(false);
          navigate("/categories");
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: CHAT_UNAVAILABLE_WHATSAPP_TEXT,
            sender: "bot",
            timestamp: new Date(),
            action: "whatsapp",
          },
        ]);
        return;
      }

      if (data?.handoff) {
        const channel = data?.handoffChannel || "whatsapp";
        const support = data?.support || {};
        const botMsg = {
          id: Date.now() + 1,
          text: data.message || "I’m transferring you to our support team. Please hold on.",
          sender: "bot",
          timestamp: new Date(),
          action: "handoff",
          handoffChannel: channel,
          support: {
            phone: support.phone || SUPPORT_PHONE_E164,
            whatsapp: support.whatsapp || SUPPORT_WHATSAPP,
          },
        };
        setMessages((prev) => [...prev, botMsg]);
        conversationRef.current = [
          ...conversationRef.current,
          { role: "assistant", content: botMsg.text },
        ];
        return;
      }

      if (looksLikeModelUnavailablePayload(data.message)) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: CHAT_UNAVAILABLE_WHATSAPP_TEXT,
            sender: "bot",
            timestamp: new Date(),
            action: "whatsapp",
          },
        ]);
        return;
      }

      const botMsg = {
        id: Date.now() + 1,
        text: data.message || "I'm here to help! What are you looking for?",
        sender: "bot",
        timestamp: new Date(),
        products: data.products || [],
      };
      setMessages((prev) => [...prev, botMsg]);
      conversationRef.current = [
        ...conversationRef.current,
        { role: "assistant", content: botMsg.text },
      ];
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: CHAT_UNAVAILABLE_WHATSAPP_TEXT,
          sender: "bot",
          timestamp: new Date(),
          action: "whatsapp",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text && !loading) return;
    if (text) sendToApi(text);
  };

  const handleQuickOption = (opt) => {
    if (opt.value === "") {
      return;
    }
    sendToApi(opt.value);
  };

  const handleAction = (action) => {
    if (action === "whatsapp") {
      window.open(buildWhatsAppLink("Hello! I need assistance with SK Fruits."), "_blank", "noopener,noreferrer");
    }
    if (action === "call") {
      window.open(`tel:${SUPPORT_PHONE_E164}`, "_self");
    }
  };

  const quickActions = [
    { label: "Browse Products", action: () => navigate("/categories") },
    { label: "Chat on WhatsApp", action: () => window.open(buildWhatsAppLink("Hello! I need assistance with SK Fruits."), "_blank", "noopener,noreferrer") },
    { label: "Call Support", action: () => window.open(`tel:${SUPPORT_PHONE_E164}`, "_self") },
  ];

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={toggleChat}
          aria-label="Chat with us"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={`fab-button fab-button--chat${!hasInteracted ? " fab-button--pulse" : ""}`}
        >
          <span className="fab-tooltip" role="tooltip">
            Chat with us
          </span>
          <ChatBotIcon className="h-7 w-7" />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-0 md:bottom-[11.5rem] md:right-6 md:left-auto z-50 w-full md:w-96 h-[100dvh] md:h-[600px] bg-white md:rounded-2xl shadow-2xl flex flex-col border-2 md:border-2 border-t-2 overflow-hidden"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card-white)" }}
          role="dialog"
          aria-modal="true"
          aria-label="SK Fruits support chat"
        >
          {/* Header - responsive padding */}
          <div
            className="p-3 md:p-4 border-b-2 flex items-center justify-between shrink-0"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full text-white shadow-md"
                style={{ background: "linear-gradient(135deg, #fb923c 0%, #f97316 52%, #ea580c 100%)" }}
              >
                <ChatBotIcon className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div>
                <h3 className="font-bold text-sm md:text-base" style={{ color: "var(--foreground)" }}>
                  SK Fruits Support
                </h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Customer support assistant
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="p-1 rounded-lg hover:bg-white/50 transition"
            >
              <svg className="w-5 h-5" style={{ color: "var(--foreground)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages - responsive padding and spacing */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4" style={{ backgroundColor: "var(--card-white)" }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] md:max-w-[90%] rounded-2xl px-3 md:px-4 py-2 ${
                    msg.sender === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                  }`}
                  style={{
                    backgroundColor: msg.sender === "user" ? "var(--peach-bg)" : "var(--secondary)",
                    color: "var(--foreground)",
                  }}
                >
                  <p className="text-xs md:text-sm whitespace-pre-line">{msg.text}</p>
                  {msg.quickOptions && msg.sender === "bot" && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.quickOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickOption(opt)}
                          disabled={loading || opt.value === ""}
                          className="px-2 md:px-2.5 py-1 rounded-full text-[10px] md:text-xs font-medium transition disabled:opacity-50"
                          style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.products.map((p) => (
                        <ProductCard key={p.id} product={p} compact />
                      ))}
                    </div>
                  )}
                  {msg.action === "whatsapp" && (
                    <button
                      onClick={() => handleAction("whatsapp")}
                      className="mt-2 px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-semibold w-full"
                      style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
                    >
                      Chat on WhatsApp
                    </button>
                  )}
                  {msg.action === "handoff" && (
                    <div className="mt-2 space-y-2">
                      <button
                        onClick={() => {
                          const phone = msg?.support?.phone || SUPPORT_PHONE_E164;
                          window.open(`tel:${phone}`, "_self");
                        }}
                        className="px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-semibold w-full"
                        style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
                      >
                        Call support
                      </button>
                      <button
                        onClick={() => {
                          const wa = msg?.support?.whatsapp || SUPPORT_WHATSAPP;
                          const lastUser = conversationRef.current
                            .slice()
                            .reverse()
                            .find((m) => m.role === "user")?.content;
                          const link = `https://wa.me/${wa}?text=${encodeURIComponent(
                            `Hello! I need help. ${lastUser ? `My question: ${lastUser}` : ""}`.trim()
                          )}`;
                          window.open(link, "_blank", "noopener,noreferrer");
                        }}
                        className="px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-semibold w-full"
                        style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
                      >
                        Chat on WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-sm px-3 md:px-4 py-2"
                  style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
                >
                  <span className="inline-block w-3 h-3 md:w-4 md:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-xs md:text-sm">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions - responsive and scrollable on mobile */}
          <div
            className="p-2 md:p-3 border-t-2 flex gap-1.5 md:gap-2 overflow-x-auto shrink-0 scrollbar-hide"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}
          >
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.action}
                className="px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold whitespace-nowrap transition-all"
                style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input form - responsive padding and sizing */}
          <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t-2 shrink-0" style={{ borderColor: "var(--border)" }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-xs md:text-sm border-2 focus:outline-none transition"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card-white)", color: "var(--foreground)" }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3 md:px-4 py-2 md:py-2.5 rounded-full font-semibold transition hover:scale-105 active:scale-95 disabled:opacity-50 shrink-0"
                style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 2 9 18z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
