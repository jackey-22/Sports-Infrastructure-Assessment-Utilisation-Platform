const CATEGORY_IDS = [
  "playingSurface",
  "lighting",
  "sanitation",
  "safety",
  "accessibility",
  "maintenance",
];

const CATEGORY_LABELS = {
  playingSurface: "Playing surface and turf",
  lighting: "Lighting infrastructure",
  sanitation: "Washrooms and sanitation",
  safety: "Safety equipment and visible hazards",
  accessibility: "Accessibility infrastructure",
  maintenance: "General facility maintenance",
};

const SEVERITIES = new Set(["none", "low", "moderate", "high", "unknown"]);
const PRIORITIES = new Set(["routine", "soon", "urgent", "unknown"]);
const SEVERITY_POINTS = { none: 100, low: 75, moderate: 50, high: 25 };

const DISCLAIMER =
  "Automated visual observation of the uploaded photographs only. Not an official engineering, electrical, structural or safety certification.";

const SCORE_METHOD =
  "Visual condition index is the mean of observed categories only (none=100, low=75, moderate=50, high=25). Categories the photographs do not show are excluded. It is separate from the questionnaire score and is not a certification.";

// Photographs are forwarded to the configured provider and are not written to disk.
// shortcut: EXIF stays in the bytes sent to the provider, strip it when an image re-encoder is added.
const TRANSMISSION_NOTE =
  "The photograph bytes were sent to the configured vision provider for this analysis and were not stored on the KhelGujarat server.";

class VisionError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "VisionError";
    this.status = status;
  }
}

let fetchImpl = (...args) => global.fetch(...args);

function setVisionFetch(fn) {
  fetchImpl = fn || ((...args) => global.fetch(...args));
}

function clip(value, max) {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function asList(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clip(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function providerConfig() {
  const gemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const openai = process.env.OPENAI_API_KEY || "";
  const anthropic = process.env.ANTHROPIC_API_KEY || "";
  const keys = { gemini, openai, anthropic };
  const requested = String(process.env.AI_PROVIDER || "")
    .trim()
    .toLowerCase();
  const provider = requested || ["gemini", "openai", "anthropic"].find((name) => keys[name]);
  if (!provider) return null;
  if (!keys[provider]) {
    throw new VisionError(
      `AI_PROVIDER is ${provider}, but its API key is not set. Photographs were not sent anywhere.`,
      503
    );
  }
  const defaults = {
    gemini: "gemini-flash-lite-latest",
    openai: "gpt-4o-mini",
    anthropic: "claude-sonnet-4-5",
  };
  return {
    provider,
    model: process.env.AI_MODEL || defaults[provider],
    apiKey: keys[provider],
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 45000,
  };
}

function buildPrompt(images, managerNotes) {
  const names = images.map((image, index) => `${index}: ${image.filename}`).join(", ");
  return [
    "You inspect photographs of a sports facility. Reply with JSON only.",
    "Judge only what is visible in the photographs.",
    "Do not infer hidden structural safety, electrical compliance, lux levels, water quality, or anything a photograph cannot establish.",
    "For each category set observable to false when the photograph does not show it. Do not invent defects for those categories.",
    "Sanitation is observable only when a washroom, tap, drain, bin, or waste is in frame. A tidy court or pitch is not sanitation evidence. Accessibility is observable only when a ramp, lift, accessible route, or accessible toilet is in frame.",
    "Manager notes are claims, not visual evidence. Never turn them into defects. Put unconfirmed notes in managerClaimsNotVerified.",
    `Photographs: ${names}.`,
    managerNotes
      ? `Manager notes (not visual evidence): ${clip(managerNotes, 1500)}`
      : "Manager notes: none.",
    "Categories, use these ids exactly: playingSurface, lighting, sanitation, safety, accessibility, maintenance.",
    "severity is one of none, low, moderate, high, unknown.",
    "priority is one of routine, soon, urgent, unknown.",
    "confidence is a number from 0 to 1.",
    '{"overallSummary":"","priority":"unknown","categories":[{"id":"playingSurface","observable":false,"condition":"","evidence":[],"defects":[{"description":"","severity":"unknown"}],"severity":"unknown","maintenance":"","confidence":0}],"imageFindings":[{"imageIndex":0,"observations":""}],"uncertain":[],"managerClaimsNotVerified":[]}',
  ].join("\n");
}

function normalizeAnalysis(raw, meta) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new VisionError(
      "The vision model returned an unusable analysis. No assessment was saved."
    );
  }
  const incoming = Array.isArray(raw.categories) ? raw.categories : [];
  const categories = CATEGORY_IDS.map((id) => {
    const source = incoming.find((row) => row && row.id === id) || {};
    let severity = SEVERITIES.has(source.severity) ? source.severity : "unknown";
    const evidence = asList(source.evidence, 5, 300);
    let observable = source.observable === true && severity !== "unknown" && evidence.length > 0;
    if (!observable) severity = "unknown";
    const defects = observable
      ? (Array.isArray(source.defects) ? source.defects : [])
          .map((defect) => ({
            description: clip(defect && defect.description, 300),
            severity: SEVERITIES.has(defect && defect.severity)
              ? defect.severity
              : severity,
          }))
          .filter((defect) => defect.description)
          .slice(0, 5)
      : [];
    return {
      id,
      label: CATEGORY_LABELS[id],
      observable,
      condition: clip(source.condition, 400) ||
        (observable
          ? "Observed in the photographs."
          : "Cannot be determined from the photographs."),
      evidence: observable ? evidence : [],
      defects,
      severity,
      maintenance: observable ? clip(source.maintenance, 400) : "",
      confidence: observable ? clampConfidence(source.confidence) : 0,
      source: observable ? "photograph" : "not_observable",
    };
  });

  const observed = categories.filter((row) => SEVERITY_POINTS[row.severity] != null);
  const visualConditionIndex = observed.length
    ? Math.round(
        observed.reduce((sum, row) => sum + SEVERITY_POINTS[row.severity], 0) /
          observed.length
      )
    : null;
  const priority = PRIORITIES.has(raw.priority) && observed.length ? raw.priority : "unknown";

  return {
    status: "completed",
    provider: meta.provider,
    model: meta.model,
    analysedAt: meta.analysedAt,
    transmittedToProvider: true,
    transmissionNote: `${TRANSMISSION_NOTE} Provider: ${meta.provider}. Model: ${meta.model}.`,
    overallSummary: clip(raw.overallSummary, 800) ||
      "The model did not provide an overall summary.",
    priority,
    categories,
    imageFindings: (Array.isArray(raw.imageFindings) ? raw.imageFindings : [])
      .map((row) => ({
        imageIndex: Number(row && row.imageIndex),
        filename: meta.filenames[Number(row && row.imageIndex)] || "",
        observations: clip(row && row.observations, 400),
      }))
      .filter(
        (row) =>
          Number.isInteger(row.imageIndex) &&
          row.imageIndex >= 0 &&
          row.imageIndex < meta.filenames.length &&
          row.observations
      )
      .slice(0, meta.filenames.length),
    uncertain: asList(raw.uncertain, 8, 300),
    managerClaimsNotVerified: asList(raw.managerClaimsNotVerified, 8, 300),
    visualConditionIndex,
    scoreMethod: visualConditionIndex == null
      ? "No visual condition index was calculated because no category was both visible and supported by stated evidence."
      : SCORE_METHOD,
    disclaimer: DISCLAIMER,
  };
}

function extractJson(text) {
  const body = String(text || "").trim();
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : body;
  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new VisionError(
      "The vision model returned an unusable analysis. No assessment was saved."
    );
  }
}

// Provider spikes return 429/5xx and temporary network failures; retrying is cheaper than losing the upload.
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestModel(config, images, managerNotes) {
  const prompt = buildPrompt(images, managerNotes);
  const timeout = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 45000;
  const body = JSON.stringify(requestBody(config, images, prompt));

  for (let attempt = 1; ; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(requestUrl(config), {
        method: "POST",
        headers: requestHeaders(config),
        body,
        signal: AbortSignal.timeout(timeout),
      });
    } catch (error) {
      const timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
      if (attempt < MAX_ATTEMPTS) {
        await wait(attempt * 700);
        continue;
      }
      throw new VisionError(
        timedOut
          ? "The vision provider timed out. No analysis was saved."
          : "The vision provider could not be reached. No analysis was saved.",
        timedOut ? 504 : 502
      );
    }

    if (response.ok) {
      return extractJson(readText(config.provider, await response.json().catch(() => null)));
    }
    if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
      await response.text().catch(() => "");
      await wait(attempt * 700);
      continue;
    }
    throw new VisionError(providerFailureMessage(response.status), 502);
  }
}

function providerFailureMessage(status) {
  if (status === 401 || status === 403) {
    return "The vision provider rejected the API key. No analysis was saved.";
  }
  if (status === 429) {
    return "The vision provider is rate limiting requests. No analysis was saved.";
  }
  if (status === 503) {
    return "The vision provider is busy right now. Please try again in a moment. No analysis was saved.";
  }
  return `The vision provider returned an error (status ${status}). No analysis was saved.`;
}

function requestUrl(config) {
  if (config.provider === "gemini") {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
  }
  if (config.provider === "openai") return "https://api.openai.com/v1/chat/completions";
  return "https://api.anthropic.com/v1/messages";
}

function requestHeaders(config) {
  if (config.provider === "gemini") {
    return {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    };
  }
  if (config.provider === "openai") {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };
  }
  return {
    "Content-Type": "application/json",
    "x-api-key": config.apiKey,
    "anthropic-version": "2023-06-01",
  };
}

function imagePart(config, image) {
  const data = image.buffer.toString("base64");
  if (config.provider === "gemini") {
    return { inline_data: { mime_type: image.mime, data } };
  }
  if (config.provider === "openai") {
    return {
      type: "image_url",
      image_url: { url: `data:${image.mime};base64,${data}` },
    };
  }
  return {
    type: "image",
    source: { type: "base64", media_type: image.mime, data },
  };
}

function requestBody(config, images, prompt) {
  if (config.provider === "gemini") {
    return {
      contents: [
        {
          parts: [{ text: prompt }, ...images.map((image) => imagePart(config, image))],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };
  }
  if (config.provider === "openai") {
    return {
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...images.map((image) => imagePart(config, image)),
          ],
        },
      ],
    };
  }
  return {
    model: config.model,
    max_tokens: 4000,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: [
          ...images.map((image) => imagePart(config, image)),
          { type: "text", text: prompt },
        ],
      },
    ],
  };
}

function readText(provider, payload) {
  if (!payload || typeof payload !== "object") return "";
  if (provider === "gemini") {
    const parts = payload.candidates && payload.candidates[0] && payload.candidates[0].content
      ? payload.candidates[0].content.parts
      : [];
    return (parts || []).map((part) => part.text || "").join("");
  }
  if (provider === "openai") {
    const message = payload.choices && payload.choices[0] && payload.choices[0].message;
    return message ? message.content : "";
  }
  const blocks = Array.isArray(payload.content) ? payload.content : [];
  return blocks.map((block) => block.text || "").join("");
}

async function analyseImages(images, context = {}) {
  const config = providerConfig();
  if (!config) {
    throw new VisionError(
      "Image analysis is not configured. Set AI_PROVIDER and the matching API key on the server. Photographs were not sent anywhere.",
      503
    );
  }
  const raw = await requestModel(config, images, context.managerNotes);
  return normalizeAnalysis(raw, {
    provider: config.provider,
    model: config.model,
    analysedAt: new Date().toISOString(),
    filenames: images.map((image) => image.filename),
  });
}

module.exports = {
  CATEGORY_IDS,
  DISCLAIMER,
  SCORE_METHOD,
  VisionError,
  setVisionFetch,
  providerConfig,
  normalizeAnalysis,
  analyseImages,
};
