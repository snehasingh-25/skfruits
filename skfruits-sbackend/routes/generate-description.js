import express from "express";
// import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import prisma from "../prisma.js";

const router = express.Router();

// Image-based product description prompt (analyze image first, then write)
const systemPrompt = `You are a professional e-commerce product copywriter and visual analyst.

IMPORTANT:
You will receive a PRODUCT IMAGE (when provided).
You MUST analyze the image carefully before writing anything.

STRICT RULES:
- Do NOT write generic descriptions.
- Do NOT assume features that are not visible.
- Base the description ONLY on what you can clearly see in the image.
- If something is unclear, describe it cautiously (e.g. "appears to be").

YOUR TASK:
1. Analyze the product image and identify:
   - Product type
   - Visible color(s)
   - Shape & design
   - Material (only if visually inferable)
   - Size impression (compact, medium, large)
   - Functional elements (lid, handle, texture, pattern, etc.)
   - Use cases suggested by the design

2. Then generate a HIGH-QUALITY e-commerce product description in SIMPLE, CONVERTING English:
   - First paragraph: short, attractive overview
   - Bullet points: visible features & benefits
   - Usage suggestions based on appearance
   - Keep tone professional, modern, and trustworthy

3. Do NOT mention:
   - "From the image"
   - "It looks like"
   - Any AI-related wording

4. Output format (use exactly these labels):

TITLE:
(Short, clear product title based on image)

DESCRIPTION:
(2–3 short paragraphs)

KEY FEATURES:
- Feature 1
- Feature 2
- Feature 3
- Feature 4

USAGE:
(Where and how this product can be used)

If no image is provided, use the product context given and follow the same format. If the image is low quality or unclear, write the best possible description based on visible details only.`;

function buildContextMessage(body) {
  const {
    product_name = "",
    category = "",
    size = "",
    material = "",
    color = "",
    target_audience = "",
    price_range = "",
    use_case = "",
    features = "",
    language = "English",
  } = body;

  return `Product context (use if no image or to supplement): Name: ${product_name}. Category: ${category}. Size: ${size}. Material: ${material || "Not specified"}. Color: ${color || "Not specified"}. Target: ${target_audience || "Not specified"}. Price: ${price_range || "Not specified"}. Use case: ${use_case || "Not specified"}. Features: ${features || "None"}. Language: ${language}.`;
}

// Rate limit: 1 AI call per product per 60s, 1 per IP per 60s
const productIdLastCall = new Map();
const ipLastCall = new Map();
const RATE_LIMIT_MS = 60_000;

function checkRateLimit(productId, ip) {
  const now = Date.now();
  if (productId != null) {
    const last = productIdLastCall.get(productId);
    if (last != null && now - last < RATE_LIMIT_MS) {
      return { ok: false, message: "Description already generated. Wait 1 minute before regenerating." };
    }
  }
  const lastIp = ipLastCall.get(ip);
  if (lastIp != null && now - lastIp < RATE_LIMIT_MS) {
    return { ok: false, message: "Rate limit: 1 request per minute." };
  }
  return { ok: true };
}

async function fetchImageAsBase64(imageUrl) {
  try {
    const res = await fetch(imageUrl, { headers: { Accept: "image/*" } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString("base64");
  } catch {
    return null;
  }
}

function inferMimeType(url) {
  const u = (url || "").toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  if (u.includes(".gif")) return "image/gif";
  return "image/jpeg";
}

router.post("/", async (req, res) => {
  try {
    const { productId: rawProductId, forceRegenerate, imageUrl, ...rest } = req.body;
    const productId = rawProductId != null ? Number(rawProductId) : null;
    const force = !!forceRegenerate;
    const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim() || "unknown";

    // RULE 1: If product has cached aiDescription and not forcing regenerate → return cache, no AI call
    if (productId != null && !force) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { aiDescription: true },
      });
      if (product?.aiDescription?.trim()) {
        return res.json({ description: product.aiDescription.trim(), fromCache: true });
      }
    }

    // Rate limit before calling AI
    const limit = checkRateLimit(productId, ip);
    if (!limit.ok) {
      return res.status(429).json({ error: limit.message });
    }

    const contextText = buildContextMessage(rest);
    let resolvedImageUrl = imageUrl && typeof imageUrl === "string" ? imageUrl.trim() : "";
    if (resolvedImageUrl && resolvedImageUrl.startsWith("/")) {
      const base = process.env.API_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000";
      resolvedImageUrl = base.replace(/\/$/, "") + resolvedImageUrl;
    }
    const instructionText = resolvedImageUrl
      ? `Analyze the product image above carefully, then generate the description in the required format. Context: ${contextText}`
      : `No image provided. Generate the description from context only, in the required format. ${contextText}`;

    let parts = [];
    if (resolvedImageUrl) {
      const base64 = await fetchImageAsBase64(resolvedImageUrl);
      if (base64) {
        parts.push({
          inlineData: {
            mimeType: inferMimeType(imageUrl),
            data: base64,
          },
        });
      }
    }
    parts.push({ text: `${systemPrompt}\n\n---\n\n${instructionText}` });

    // --- Gemini / Gemma (Gemma does not support systemInstruction; prepend to user message) ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== "") {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemma-3-27b-it",
        contents: [{ role: "user", parts }],
        config: {
          maxOutputTokens: 800,
          temperature: 0.7,
        },
      });
      const text = response.text?.trim();
      if (!text) {
        return res.status(502).json({ error: "No description returned from service." });
      }

      // RULE 4: Cache in DB when we have a productId
      if (productId != null) {
        await prisma.product.update({
          where: { id: productId },
          data: { aiDescription: text },
        });
      }

      productIdLastCall.set(productId, Date.now());
      ipLastCall.set(ip, Date.now());

      return res.json({ description: text, fromCache: false });
    }

    // --- OpenAI (commented out – uncomment and set OPENAI_API_KEY to use) ---
    // const openaiKey = process.env.OPENAI_API_KEY;
    // if (openaiKey && openaiKey.trim() !== "") {
    //   const openai = new OpenAI({ apiKey: openaiKey });
    //   const userMessage = buildUserMessage(rest);
    //   const completion = await openai.chat.completions.create({
    //     model: "gpt-4o",
    //     messages: [
    //       { role: "system", content: systemPrompt },
    //       { role: "user", content: userMessage },
    //     ],
    //     max_tokens: 400,
    //     temperature: 0.7,
    //   });
    //   const text = completion.choices[0]?.message?.content?.trim();
    //   if (!text) {
    //     return res.status(502).json({ error: "No description returned from service." });
    //   }
    //   if (productId != null) {
    //     await prisma.product.update({
    //       where: { id: productId },
    //       data: { aiDescription: text },
    //     });
    //   }
    //   productIdLastCall.set(productId, Date.now());
    //   ipLastCall.set(ip, Date.now());
    //   return res.json({ description: text, fromCache: false });
    // }

    return res.status(400).json({
      error: "GEMINI_API_KEY is not configured. Add it in your server environment variables.",
    });
  } catch (err) {
    console.error("Generate description error:", err);
    const status = err.status === 401 ? 401 : err.status === 429 ? 429 : 500;
    const message =
      err.message ||
      err.error?.message ||
      "Failed to generate description.";
    return res.status(status).json({ error: message });
  }
});

export default router;
