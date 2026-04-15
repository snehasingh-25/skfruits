import express from "express";

const router = express.Router();

const COMPANY_NAME = process.env.CHATBOT_COMPANY_NAME || "SK Fruits";
const SUPPORT_PHONE_E164 = process.env.SUPPORT_PHONE_E164 || "+919116546255";
const SUPPORT_WHATSAPP = process.env.SUPPORT_WHATSAPP || "919116546255";

const ASK_TEAM = "Would you like me to connect you with our team?";

function getLastUserText(messages) {
  for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === "user") return String(m.content || "");
  }
  return "";
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildHandoffPayload(channel = "whatsapp") {
  return {
    message: "I’m transferring you to our support team. Please hold on.",
    products: [],
    handoff: true,
    handoffChannel: channel,
    support: {
      phone: SUPPORT_PHONE_E164,
      whatsapp: SUPPORT_WHATSAPP,
    },
  };
}

function detectHandoffIntent(userText) {
  const t = normalizeText(userText);
  if (!t) return null;
  const wantsHuman =
    /\b(human|agent|representative|support team|team|someone|person|talk to|speak to|call me|call|phone|urgent|asap|immediately|right away)\b/.test(
      t
    ) ||
    /need help|help me|complaint|refund|cancel order|return|damaged|wrong item/.test(t);
  if (!wantsHuman) return null;

  const wantsCall = /\b(call|phone|ring)\b/.test(t);
  return { channel: wantsCall ? "call" : "whatsapp" };
}

/** Rule-based replies only — no LLM, minimal processing. Unknown → handoff. */
function buildFaqReply(userText) {
  const t = normalizeText(userText);
  if (!t) return null;

  // Topic keywords before generic “hi/hello” so “hello, what’s the price?” hits pricing.
  if (/\b(hours|timing|open|close|working hours)\b/.test(t)) {
    return { message: `Support is available during our usual business hours. ${ASK_TEAM}`, handoff: false };
  }
  if (/\b(delivery|shipping|deliver|how long)\b/.test(t)) {
    return { message: `Delivery depends on your area and what you order. ${ASK_TEAM}`, handoff: false };
  }
  if (/\b(price|pricing|cost|how much)\b/.test(t)) {
    return { message: `Prices are shown on each product. ${ASK_TEAM}`, handoff: false };
  }
  if (/\b(available|availability|in stock|stock)\b/.test(t)) {
    return { message: `Stock can change quickly. ${ASK_TEAM}`, handoff: false };
  }
  if (/\b(payment|pay|cod|upi|card)\b/.test(t)) {
    return {
      message: `We accept Razorpay payments: UPI, Debit/Credit Cards, Netbanking, and Wallets. ${ASK_TEAM}`,
      handoff: false,
    };
  }
  if (/\b(return|refund|replace|cancel)\b/.test(t)) {
    return { handoff: true, handoffChannel: "whatsapp" };
  }
  if (/\b(track|order status|where is my order|my order)\b/.test(t)) {
    return { handoff: true, handoffChannel: "whatsapp" };
  }
  if (/\b(shop|buy|product|fruits|catalog|menu)\b/.test(t)) {
    return {
      message: `You can browse products on the site. ${ASK_TEAM}`,
      handoff: false,
    };
  }

  if (/\b(thanks|thank you|thx)\b/.test(t)) {
    return { message: `You’re welcome! ${ASK_TEAM}`, handoff: false };
  }
  if (/\b(bye|goodbye)\b/.test(t)) {
    return { message: "Goodbye — we’re here if you need anything else.", handoff: false };
  }
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(t)) {
    return {
      message: `Hi! I’m here for quick questions about ${COMPANY_NAME}. ${ASK_TEAM}`,
      handoff: false,
    };
  }

  return null;
}

router.post("/", async (req, res) => {
  try {
    const { messages = [] } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const lastUserText = getLastUserText(messages);

    const intent = detectHandoffIntent(lastUserText);
    if (intent) {
      return res.json(buildHandoffPayload(intent.channel));
    }

    const faq = buildFaqReply(lastUserText);
    if (faq?.handoff) {
      return res.json(buildHandoffPayload(faq.handoffChannel || "whatsapp"));
    }
    if (faq?.message) {
      return res.json({
        message: faq.message,
        products: [],
        handoff: false,
        handoffChannel: null,
      });
    }

    return res.json(buildHandoffPayload("whatsapp"));
  } catch (err) {
    console.error("Chat error:", err);
    return res.json(buildHandoffPayload("whatsapp"));
  }
});

export default router;
