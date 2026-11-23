const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load a local .env file for beginners running on a laptop.
// Real hosting platforms can still provide environment variables normally.
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    });
  }
} catch (error) {
  console.error("Could not read .env:", error.message);
}

const port = Number(process.env.PORT || 3000);
const apiKeyValue = process.env.GEMINI_API_KEY || "";
const apiKeyPlaceholder = /^(replace[_-]?with.*|your[_-]?api[_-]?key.*|your_api_key_here)$/i.test(apiKeyValue);
const apiKey = apiKeyPlaceholder ? "" : apiKeyValue.trim();
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const root = __dirname;

// Cache repeated requests in memory. This avoids repeated free-quota calls.
const resourceCache = new Map();
const chatCache = new Map();
const materialCache = new Map();

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(value));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request is too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(new Error("Invalid JSON")); }
    });
  });
}

async function callGemini(prompt, maxOutputTokens) {
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxOutputTokens
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data.error && data.error.message
      ? data.error.message
      : "Gemini request failed";
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

function parseJsonText(text) {
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(clean);
}

function limitText(text, limit) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > limit ? value.slice(0, limit) : value;
}

async function handleGenerate(request, response) {
  const body = await readJson(request);
  const title = limitText(body.title, 100);
  const text = limitText(body.text, 16000);
  if (!text) {
    sendJson(response, 400, { error: "Study material text is required." });
    return;
  }

  const hash = crypto.createHash("sha256").update(text).digest("hex");
  if (resourceCache.has(hash)) {
    sendJson(response, 200, resourceCache.get(hash));
    return;
  }

  const prompt =
    "Use only the study material below. Return valid JSON only. " +
    "Create: flashcards (8 maximum, question and answer), smartNotes (one concise paragraph), " +
    "keyPoints (10 maximum), summary (5 sentences maximum), importantQuestions (8 maximum). " +
    "Use simple beginner-friendly language. Keep answers short.\n\n" +
    "TITLE: " + title + "\nMATERIAL:\n" + text;

  const output = await callGemini(prompt, 2400);
  const resources = parseJsonText(output);
  const result = { resources, cached: false };
  resourceCache.set(hash, result);
  materialCache.set(body.materialId || hash, text);
  sendJson(response, 200, result);
}

async function handleChat(request, response) {
  const body = await readJson(request);
  const materialId = String(body.materialId || "");
  const question = limitText(body.question, 500);
  if (!materialId || !question) {
    sendJson(response, 400, { error: "Material and question are required." });
    return;
  }

  if (!materialCache.has(materialId) && body.text) {
    materialCache.set(materialId, limitText(body.text, 16000));
  }
  const text = materialCache.get(materialId);
  if (!text) {
    sendJson(response, 400, { error: "The study material is not available. Reopen the material and try again." });
    return;
  }

  const cacheKey = crypto.createHash("sha256")
    .update(materialId + "\n" + question)
    .digest("hex");
  if (chatCache.has(cacheKey)) {
    sendJson(response, 200, chatCache.get(cacheKey));
    return;
  }

  const history = Array.isArray(body.history)
    ? body.history.slice(-4).map((item) => {
      const role = item.role === "assistant" ? "Assistant" : "Student";
      return role + ": " + limitText(item.content, 300);
    }).join("\n")
    : "";

  const prompt =
    "Answer the student's question only from this study material. " +
    "Be accurate, concise, and beginner-friendly. Do not add outside facts.\n\n" +
    "STUDY MATERIAL:\n" + text + "\n\n" +
    (history ? "RECENT CHAT:\n" + history + "\n\n" : "") +
    "STUDENT: " + question + "\nASSISTANT:";

  const answer = await callGemini(prompt, 700);
  const result = { answer };
  chatCache.set(cacheKey, result);
  sendJson(response, 200, result);
}

async function handleApi(request, response, pathname) {
  try {
    if (pathname === "/api/status" && request.method === "GET") {
      sendJson(response, 200, {
        configured: Boolean(apiKey),
        model
      });
      return;
    }
    if (pathname === "/api/generate-learning-resources" && request.method === "POST") {
      await handleGenerate(request, response);
      return;
    }
    if (pathname === "/api/chat" && request.method === "POST") {
      await handleChat(request, response);
      return;
    }
    sendJson(response, 404, { error: "API endpoint not found." });
  } catch (error) {
    const status = error.statusCode || 500;
    sendJson(response, status, {
      error: status === 503
        ? "AI service is not configured. Add GEMINI_API_KEY to the server environment."
        : error.message || "Unexpected server error."
    });
  }
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json"
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url.pathname);
    return;
  }

  let relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep) && filePath !== path.join(root, "index.html")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("Page not found");
        return;
      }
      response.writeHead(500);
      response.end("Server error");
      return;
    }
    response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
});

server.listen(port, () => {
  console.log("SchoolBook is running at http://localhost:" + port);
});
