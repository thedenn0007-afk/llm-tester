const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '.env'));

const PORT = process.env.PORT || 3000;

const GROQ_CAPABILITIES = {
  reasoning: {
    label: 'Reasoning',
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3-32b']
  },
  function_calling: {
    label: 'Function Calling / Tool Use',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'qwen/qwen3-32b'
    ]
  },
  text_to_speech: {
    label: 'Text to Speech',
    models: ['canopylabs/orpheus-v1-english', 'canopylabs/orpheus-arabic-saudi']
  },
  speech_to_text: {
    label: 'Speech to Text',
    models: ['whisper-large-v3', 'whisper-large-v3-turbo']
  },
  text_to_text: {
    label: 'Text to Text',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'llama-3.3-70b-versatile'
    ]
  },
  vision: {
    label: 'Vision',
    models: ['meta-llama/llama-4-scout-17b-16e-instruct']
  },
  multilingual: {
    label: 'Multilingual',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'llama-3.3-70b-versatile',
      'whisper-large-v3'
    ]
  },
  safety: {
    label: 'Safety / Content Moderation',
    models: ['openai/gpt-oss-20b']
  }
};

const GROQ_MODEL_LABELS = {
  'openai/gpt-oss-120b': 'GPT OSS 120B',
  'openai/gpt-oss-20b': 'GPT OSS 20B',
  'qwen/qwen3-32b': 'Qwen 3 32B',
  'meta-llama/llama-4-scout-17b-16e-instruct': 'Llama 4 Scout',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'whisper-large-v3': 'Whisper Large v3',
  'whisper-large-v3-turbo': 'Whisper Large v3 Turbo',
  'canopylabs/orpheus-v1-english': 'Orpheus English',
  'canopylabs/orpheus-arabic-saudi': 'Orpheus Arabic Saudi'
};

const GROQ_TTS_VOICES = {
  'canopylabs/orpheus-v1-english': ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'],
  'canopylabs/orpheus-arabic-saudi': ['fahad', 'sultan', 'lulwa', 'noura']
};

const groqUniqueModelIds = Array.from(
  new Set(Object.values(GROQ_CAPABILITIES).flatMap((cap) => cap.models))
);

const PROVIDERS = {
  zai: {
    label: 'z.ai',
    apiKey: process.env.ZAI_API_KEY || '',
    baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4',
    chatPath: process.env.ZAI_CHAT_PATH || '/chat/completions',
    defaultModel: process.env.ZAI_MODEL || 'glm-4.5-flash',
    models: [
      { id: 'glm-4.7-flash', label: 'GLM-4.7-Flash' },
      { id: 'glm-4.5-flash', label: 'GLM-4.5-Flash' }
    ]
  },
  gemini: {
    label: 'Gemini Flash',
    apiKey: process.env.GEMINI_API_KEY || '',
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
    chatPath: '/chat/completions',
    defaultModel: 'gemini-2.5-flash-lite',
    models: [
      { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
      { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
      { id: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite' },
      { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash' }
    ]
  },
  deepseek: {
    label: 'DeepSeek',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    chatPath: '/chat/completions',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', label: 'deepseek-chat' },
      { id: 'deepseek-reasoner', label: 'deepseek-reasoner' }
    ]
  },
  groq: {
    label: 'Groq',
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    chatPath: '/chat/completions',
    defaultModel: 'openai/gpt-oss-20b',
    models: groqUniqueModelIds.map((id) => ({ id, label: GROQ_MODEL_LABELS[id] || id })),
    capabilities: GROQ_CAPABILITIES,
    ttsVoices: GROQ_TTS_VOICES
  },
  openrouter: {
    label: 'OpenRouter',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    chatPath: '/chat/completions',
    defaultModel: 'openrouter/free',
    models: [
      { id: 'openrouter/free', label: 'openrouter/free' },
      { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'meta-llama/llama-3.2-3b-instruct:free' }
    ]
  }
};

const PUBLIC_PROVIDER_CONFIG = Object.fromEntries(
  Object.entries(PROVIDERS).map(([key, value]) => [
    key,
    {
      label: value.label,
      defaultModel: value.defaultModel,
      models: value.models,
      capabilities: value.capabilities || null,
      ttsVoices: value.ttsVoices || null
    }
  ])
);

const PRESET_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get mock weather for a city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' }
        },
        required: ['city']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_math',
      description: 'Evaluate a safe arithmetic expression.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Arithmetic expression' }
        },
        required: ['expression']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_docs',
      description: 'Mock search in local docs index.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  }
];

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function providerMissingKeyMessage(providerKey) {
  return `Missing API key for provider "${providerKey}". Set the required environment variable and restart.`;
}

function extractContent(messageContent) {
  if (typeof messageContent === 'string') return messageContent;
  if (!Array.isArray(messageContent)) return '';

  return messageContent
    .map((part) => {
      if (typeof part === 'string') return part;
      if (!part || typeof part !== 'object') return '';
      if (part.type === 'text') return part.text || '';
      if (part.type === 'output_text') return part.text || '';
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function safeEvalExpression(input) {
  if (!/^[0-9+\-*/().\s]+$/.test(input)) {
    return { ok: false, error: 'Expression contains unsupported characters.' };
  }

  try {
    const result = Function(`"use strict"; return (${input});`)();
    if (typeof result !== 'number' || Number.isNaN(result)) {
      return { ok: false, error: 'Could not evaluate expression.' };
    }
    return { ok: true, result };
  } catch {
    return { ok: false, error: 'Invalid arithmetic expression.' };
  }
}

function runPresetTool(name, argsObj) {
  if (name === 'get_weather') {
    const city = argsObj.city || 'Unknown';
    const seeds = ['Sunny', 'Cloudy', 'Light Rain', 'Windy'];
    const seed = city.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const condition = seeds[seed % seeds.length];
    const c = 18 + (seed % 14);
    return { city, condition, tempC: c, source: 'mock-local-tool' };
  }

  if (name === 'calculate_math') {
    const expression = argsObj.expression || '';
    const calc = safeEvalExpression(expression);
    if (!calc.ok) return { expression, error: calc.error };
    return { expression, result: calc.result };
  }

  if (name === 'search_docs') {
    const query = argsObj.query || '';
    return {
      query,
      hits: [
        `Mock hit 1 for "${query}"`,
        `Mock hit 2 for "${query}"`,
        `Mock hit 3 for "${query}"`
      ]
    };
  }

  return { error: `Unknown tool: ${name}` };
}

function buildHeaders(providerKey, provider) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${provider.apiKey}`
  };

  if (providerKey === 'openrouter') {
    const siteUrl = process.env.OPENROUTER_SITE_URL || 'http://localhost:3000';
    const appName = process.env.OPENROUTER_APP_NAME || 'LLM Multi Provider Tester';
    headers['HTTP-Referer'] = siteUrl;
    headers['X-Title'] = appName;
  }

  return headers;
}

function buildRequestMeta(providerKey, capability, model, data) {
  return {
    provider: providerKey,
    capability: capability || null,
    model,
    requestId: data?.id || data?.x_groq?.id || null
  };
}

async function callChat(providerKey, provider, payload) {
  const started = Date.now();
  const response = await fetch(`${provider.baseUrl}${provider.chatPath}`, {
    method: 'POST',
    headers: buildHeaders(providerKey, provider),
    body: JSON.stringify(payload)
  });

  const elapsedMs = Date.now() - started;
  const data = await response.json().catch(() => ({}));
  return { response, data, elapsedMs };
}

function buildVisionMessages(messages, images) {
  if (!images || images.length === 0) return messages;

  const cloned = [...messages];
  const lastIdx = cloned.length - 1;
  const last = cloned[lastIdx];

  if (!last || last.role !== 'user') return messages;

  const text = typeof last.content === 'string' ? last.content : extractContent(last.content);
  const contentParts = [{ type: 'text', text }];

  for (const img of images) {
    if (!img || !img.dataUrl) continue;
    contentParts.push({
      type: 'image_url',
      image_url: { url: img.dataUrl }
    });
  }

  cloned[lastIdx] = {
    role: 'user',
    content: contentParts
  };

  return cloned;
}

async function handleGroqFunctionCalling(provider, model, incomingMessages, selectedTools) {
  const toolTrace = [];
  const messages = [...incomingMessages];

  const call1Payload = {
    model,
    messages,
    temperature: 0.7,
    stream: false,
    tools: selectedTools,
    tool_choice: 'auto'
  };

  const first = await callChat('groq', provider, call1Payload);
  if (!first.response.ok) {
    return { ok: false, status: first.response.status, raw: first.data, elapsedMs: first.elapsedMs };
  }

  const assistantMessage = first.data?.choices?.[0]?.message || {};
  const toolCalls = assistantMessage.tool_calls || [];

  if (toolCalls.length === 0) {
    return {
      ok: true,
      content: extractContent(assistantMessage.content),
      raw: first.data,
      elapsedMs: first.elapsedMs,
      usage: first.data?.usage || null,
      toolTrace
    };
  }

  messages.push({
    role: 'assistant',
    content: assistantMessage.content || '',
    tool_calls: toolCalls
  });

  for (const call of toolCalls) {
    const fnName = call.function?.name || 'unknown_tool';
    let argsObj = {};
    try {
      argsObj = JSON.parse(call.function?.arguments || '{}');
    } catch {
      argsObj = { parseError: 'Invalid JSON args', raw: call.function?.arguments || '' };
    }

    const result = runPresetTool(fnName, argsObj);
    toolTrace.push({ id: call.id, name: fnName, args: argsObj, result });

    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(result)
    });
  }

  const call2Payload = {
    model,
    messages,
    temperature: 0.7,
    stream: false
  };

  const second = await callChat('groq', provider, call2Payload);
  if (!second.response.ok) {
    return { ok: false, status: second.response.status, raw: second.data, elapsedMs: first.elapsedMs + second.elapsedMs };
  }

  const finalMessage = second.data?.choices?.[0]?.message || {};
  return {
    ok: true,
    content: extractContent(finalMessage.content),
    raw: {
      first: first.data,
      second: second.data
    },
    elapsedMs: first.elapsedMs + second.elapsedMs,
    usage: second.data?.usage || first.data?.usage || null,
    toolTrace
  };
}

async function handleChat(req, res) {
  try {
    const raw = await readBody(req);
    const incoming = raw ? JSON.parse(raw) : {};

    const providerKey = (incoming.provider || 'gemini').toLowerCase();
    const provider = PROVIDERS[providerKey];
    const messages = Array.isArray(incoming.messages) ? incoming.messages : [];
    const temperature = typeof incoming.temperature === 'number' ? incoming.temperature : 0.7;
    const capability = incoming.capability || null;

    if (!provider) {
      return sendJson(res, 400, { error: 'Invalid provider.' });
    }

    if (!provider.apiKey) {
      return sendJson(res, 400, { error: providerMissingKeyMessage(providerKey) });
    }

    if (messages.length === 0) {
      return sendJson(res, 400, { error: 'messages is required.' });
    }

    const model = (incoming.model || provider.defaultModel).trim();

    if (providerKey === 'groq' && capability === 'speech_to_text') {
      return sendJson(res, 400, { error: 'Use /api/groq/stt for speech-to-text.' });
    }

    if (providerKey === 'groq' && capability === 'text_to_speech') {
      return sendJson(res, 400, { error: 'Use /api/groq/tts for text-to-speech.' });
    }

    if (providerKey === 'groq' && capability === 'function_calling') {
      const requestedNames = Array.isArray(incoming.tools) ? incoming.tools : ['get_weather', 'calculate_math', 'search_docs'];
      const selectedTools = PRESET_TOOLS.filter((t) => requestedNames.includes(t.function.name));
      const toolRun = await handleGroqFunctionCalling(provider, model, messages, selectedTools);

      if (!toolRun.ok) {
        return sendJson(res, toolRun.status || 500, {
          error: toolRun.raw?.error?.message || toolRun.raw?.message || 'Groq function calling failed.',
          raw: toolRun.raw
        });
      }

      return sendJson(res, 200, {
        content: toolRun.content,
        raw: toolRun.raw,
        toolTrace: toolRun.toolTrace,
        metrics: {
          latencyMs: toolRun.elapsedMs,
          usage: toolRun.usage
        },
        requestMeta: buildRequestMeta(providerKey, capability, model, toolRun.raw?.second || toolRun.raw)
      });
    }

    const chatMessages =
      providerKey === 'groq' && capability === 'vision'
        ? buildVisionMessages(messages, Array.isArray(incoming.images) ? incoming.images : [])
        : messages;

    const payload = {
      model,
      messages: chatMessages,
      temperature,
      stream: false
    };

    const { response, data, elapsedMs } = await callChat(providerKey, provider, payload);

    if (!response.ok) {
      return sendJson(res, response.status, {
        error: data.error?.message || data.message || `${provider.label} request failed.`,
        raw: data
      });
    }

    const content = extractContent(data?.choices?.[0]?.message?.content ?? '');

    return sendJson(res, 200, {
      content,
      raw: data,
      metrics: {
        latencyMs: elapsedMs,
        usage: data?.usage || null
      },
      requestMeta: buildRequestMeta(providerKey, capability, model, data)
    });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || 'Unexpected server error.' });
  }
}

async function handleGroqStt(req, res) {
  if (!PROVIDERS.groq.apiKey) {
    return sendJson(res, 400, { error: providerMissingKeyMessage('groq') });
  }

  try {
    const raw = await readBody(req);
    const incoming = raw ? JSON.parse(raw) : {};
    const model = (incoming.model || 'whisper-large-v3-turbo').trim();
    const audioBase64 = incoming.audioBase64 || '';
    const mimeType = incoming.mimeType || 'audio/wav';
    const fileName = incoming.fileName || 'audio.wav';

    if (!audioBase64) {
      return sendJson(res, 400, { error: 'audioBase64 is required.' });
    }

    const started = Date.now();
    const bytes = Buffer.from(audioBase64, 'base64');
    const blob = new Blob([bytes], { type: mimeType });
    const form = new FormData();
    form.append('file', blob, fileName);
    form.append('model', model);

    if (incoming.language) form.append('language', incoming.language);
    if (incoming.prompt) form.append('prompt', incoming.prompt);

    const response = await fetch(`${PROVIDERS.groq.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PROVIDERS.groq.apiKey}`
      },
      body: form
    });

    const elapsedMs = Date.now() - started;
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return sendJson(res, response.status, {
        error: data.error?.message || data.message || 'Groq STT failed.',
        raw: data
      });
    }

    return sendJson(res, 200, {
      content: data.text || '',
      raw: data,
      metrics: { latencyMs: elapsedMs, usage: null },
      requestMeta: {
        provider: 'groq',
        capability: 'speech_to_text',
        model,
        requestId: data?.x_groq?.id || data?.id || null
      }
    });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || 'Unexpected STT error.' });
  }
}

async function handleGroqTts(req, res) {
  if (!PROVIDERS.groq.apiKey) {
    return sendJson(res, 400, { error: providerMissingKeyMessage('groq') });
  }

  try {
    const raw = await readBody(req);
    const incoming = raw ? JSON.parse(raw) : {};
    const model = (incoming.model || 'canopylabs/orpheus-arabic-saudi').trim();
    const input = (incoming.input || '').trim();
    const voice = (incoming.voice || 'hannah').trim();
    const responseFormat = 'wav';

    if (!input) {
      return sendJson(res, 400, { error: 'input is required.' });
    }

    const started = Date.now();
    const response = await fetch(`${PROVIDERS.groq.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PROVIDERS.groq.apiKey}`
      },
      body: JSON.stringify({
        model,
        input,
        voice,
        response_format: responseFormat
      })
    });

    const elapsedMs = Date.now() - started;

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return sendJson(res, response.status, {
        error: errData.error?.message || errData.message || 'Groq TTS failed.',
        raw: errData
      });
    }

    const mimeType = response.headers.get('content-type') || 'audio/wav';
    const arr = await response.arrayBuffer();
    const base64 = Buffer.from(arr).toString('base64');

    return sendJson(res, 200, {
      content: 'Audio generated successfully.',
      raw: null,
      audio: {
        mimeType,
        fileName: `groq-tts-${Date.now()}.wav`,
        base64
      },
      metrics: { latencyMs: elapsedMs, usage: null },
      requestMeta: {
        provider: 'groq',
        capability: 'text_to_speech',
        model,
        requestId: response.headers.get('x-request-id') || null
      }
    });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || 'Unexpected TTS error.' });
  }
}

function serveStatic(req, res) {
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  reqPath = reqPath.split('?')[0];

  const safePath = path.normalize(reqPath).replace(/^([\.\\/])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }
      sendJson(res, 500, { error: 'Could not read file' });
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/providers') {
    sendJson(res, 200, { providers: PUBLIC_PROVIDER_CONFIG });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    handleChat(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/groq/stt') {
    handleGroqStt(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/groq/tts') {
    handleGroqTts(req, res);
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
