const chatEl = document.getElementById('chat');
const providerEl = document.getElementById('provider');
const modelEl = document.getElementById('model');
const temperatureEl = document.getElementById('temperature');
const groqAreaEl = document.getElementById('groq-area');
const tabsEl = document.getElementById('capability-tabs');

const textPanelEl = document.getElementById('text-panel');
const sttPanelEl = document.getElementById('stt-panel');
const ttsPanelEl = document.getElementById('tts-panel');

const chatForm = document.getElementById('chat-form');
const promptEl = document.getElementById('prompt');
const clearBtn = document.getElementById('clear');
const retryBtn = document.getElementById('retry');
const sendBtn = document.getElementById('send');

const toolBoxEl = document.getElementById('tool-box');
const visionBoxEl = document.getElementById('vision-box');
const visionImageEl = document.getElementById('vision-image');
const visionPreviewEl = document.getElementById('vision-preview');

const sttForm = document.getElementById('stt-form');
const sttFileEl = document.getElementById('stt-file');
const sttLanguageEl = document.getElementById('stt-language');
const sttPromptEl = document.getElementById('stt-prompt');
const sttRetryBtn = document.getElementById('stt-retry');

const ttsForm = document.getElementById('tts-form');
const ttsInputEl = document.getElementById('tts-input');
const ttsVoiceEl = document.getElementById('tts-voice');
const ttsAudioEl = document.getElementById('tts-audio');
const ttsRetryBtn = document.getElementById('tts-retry');

const metricsEl = document.getElementById('metrics');
const debugRequestEl = document.getElementById('debug-request');
const debugResponseEl = document.getElementById('debug-response');

const downloadTextBtn = document.getElementById('download-text');
const downloadJsonBtn = document.getElementById('download-json');
const downloadAudioBtn = document.getElementById('download-audio');
const downloadImageBtn = document.getElementById('download-image');
const copyTextBtn = document.getElementById('copy-text');
const copyJsonBtn = document.getElementById('copy-json');

const STORAGE_KEYS = {
  provider: 'chat_tester_selected_provider',
  providerModelMap: 'chat_tester_provider_model_map',
  capability: 'chat_tester_selected_capability',
  capabilityModelMap: 'chat_tester_capability_model_map'
};

const TEXT_CAPABILITIES = new Set([
  'reasoning',
  'function_calling',
  'text_to_text',
  'vision',
  'multilingual',
  'safety'
]);

const conversation = [{ role: 'system', content: 'You are a helpful assistant.' }];
let providers = {};
let providerModelMemory = {};
let capabilityModelMemory = {};
let selectedCapability = 'reasoning';
let lastRequest = null;
let lastArtifacts = {
  text: null,
  raw: null,
  audio: null,
  imageDataUrl: null,
  meta: null
};

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = content;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function isGroqMode() {
  return providerEl.value === 'groq';
}

function selectedProviderConfig() {
  return providers[providerEl.value] || null;
}

function setDebug(requestPayload, responsePayload) {
  debugRequestEl.value = JSON.stringify(requestPayload ?? {}, null, 2);
  debugResponseEl.value = JSON.stringify(responsePayload ?? {}, null, 2);
}

function setMetrics(metrics, requestMeta) {
  const latency = metrics?.latencyMs != null ? `${metrics.latencyMs} ms` : '-';
  const usage = metrics?.usage ? JSON.stringify(metrics.usage) : '-';
  const reqId = requestMeta?.requestId || '-';
  const cap = requestMeta?.capability || '-';
  metricsEl.textContent = `Latency: ${latency} | Usage: ${usage} | Request ID: ${reqId} | Capability: ${cap}`;
}

function fileNameBase() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const provider = providerEl.value || 'provider';
  const cap = isGroqMode() ? selectedCapability : 'chat';
  const model = (modelEl.value || 'model').replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${stamp}_${provider}_${cap}_${model}`;
}

function downloadText(content, fileName, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function dataUrlToBlob(dataUrl) {
  const [meta, data] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function resetArtifactButtons() {
  downloadTextBtn.disabled = !lastArtifacts.text;
  downloadJsonBtn.disabled = !lastArtifacts.raw;
  downloadAudioBtn.disabled = !lastArtifacts.audio;
  downloadImageBtn.disabled = !lastArtifacts.imageDataUrl;
  copyTextBtn.disabled = !lastArtifacts.text;
  copyJsonBtn.disabled = !lastArtifacts.raw;
}

function setArtifacts({ text, raw, audio, imageDataUrl, meta }) {
  lastArtifacts = {
    text: text ?? null,
    raw: raw ?? null,
    audio: audio ?? null,
    imageDataUrl: imageDataUrl ?? null,
    meta: meta ?? null
  };
  resetArtifactButtons();
}

function loadMemory() {
  try {
    providerModelMemory = JSON.parse(localStorage.getItem(STORAGE_KEYS.providerModelMap) || '{}');
  } catch {
    providerModelMemory = {};
  }

  try {
    capabilityModelMemory = JSON.parse(localStorage.getItem(STORAGE_KEYS.capabilityModelMap) || '{}');
  } catch {
    capabilityModelMemory = {};
  }

  selectedCapability = localStorage.getItem(STORAGE_KEYS.capability) || 'reasoning';
}

function saveMemory() {
  localStorage.setItem(STORAGE_KEYS.provider, providerEl.value);
  localStorage.setItem(STORAGE_KEYS.providerModelMap, JSON.stringify(providerModelMemory));
  localStorage.setItem(STORAGE_KEYS.capability, selectedCapability);
  localStorage.setItem(STORAGE_KEYS.capabilityModelMap, JSON.stringify(capabilityModelMemory));
}

function updateTtsVoices() {
  ttsVoiceEl.innerHTML = '';
  const cfg = selectedProviderConfig();
  const voicesByModel = cfg?.ttsVoices || {};
  const voices = voicesByModel[modelEl.value] || ['hannah'];

  voices.forEach((voice) => {
    const option = document.createElement('option');
    option.value = voice;
    option.textContent = voice;
    ttsVoiceEl.appendChild(option);
  });
}

function renderCapabilityTabs() {
  tabsEl.innerHTML = '';
  const capMap = providers.groq?.capabilities || {};

  Object.entries(capMap).forEach(([capKey, capConfig]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = capKey === selectedCapability ? 'tab active' : 'tab';
    btn.textContent = capConfig.label;
    btn.addEventListener('click', () => {
      selectedCapability = capKey;
      saveMemory();
      renderCapabilityTabs();
      populateModelOptions();
      updatePanelVisibility();
      addMessage('system', `Switched capability to ${capConfig.label}.`);
    });
    tabsEl.appendChild(btn);
  });
}

function populateProviderOptions() {
  providerEl.innerHTML = '';
  const savedProvider = localStorage.getItem(STORAGE_KEYS.provider);

  Object.entries(providers).forEach(([providerKey, config], index) => {
    const option = document.createElement('option');
    option.value = providerKey;
    option.textContent = config.label;
    if ((savedProvider && savedProvider === providerKey) || (!savedProvider && index === 0)) {
      option.selected = true;
    }
    providerEl.appendChild(option);
  });
}

function filteredModelsForCurrentContext() {
  const config = selectedProviderConfig();
  if (!config) return [];

  if (!isGroqMode()) return config.models || [];

  const cap = config.capabilities?.[selectedCapability];
  if (!cap) return config.models || [];

  const allowed = new Set(cap.models || []);
  return (config.models || []).filter((m) => allowed.has(m.id));
}

function populateModelOptions() {
  const config = selectedProviderConfig();
  if (!config) return;

  const options = filteredModelsForCurrentContext();
  modelEl.innerHTML = '';

  if (options.length === 0) return;

  const key = isGroqMode() ? `${providerEl.value}:${selectedCapability}` : providerEl.value;
  const remembered = isGroqMode() ? capabilityModelMemory[key] : providerModelMemory[key];
  const fallback = options.some((m) => m.id === remembered)
    ? remembered
    : (options.find((m) => m.id === config.defaultModel)?.id || options[0].id);

  options.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label || m.id;
    if (m.id === fallback) opt.selected = true;
    modelEl.appendChild(opt);
  });

  if (isGroqMode()) {
    capabilityModelMemory[key] = modelEl.value;
  } else {
    providerModelMemory[key] = modelEl.value;
  }

  updateTtsVoices();
  saveMemory();
}

function updatePanelVisibility() {
  const groq = isGroqMode();
  groqAreaEl.classList.toggle('hidden', !groq);

  const isStt = groq && selectedCapability === 'speech_to_text';
  const isTts = groq && selectedCapability === 'text_to_speech';
  const isVision = groq && selectedCapability === 'vision';
  const isTool = groq && selectedCapability === 'function_calling';
  const isText = !groq || TEXT_CAPABILITIES.has(selectedCapability);

  textPanelEl.classList.toggle('hidden', !isText);
  sttPanelEl.classList.toggle('hidden', !isStt);
  ttsPanelEl.classList.toggle('hidden', !isTts);

  toolBoxEl.classList.toggle('hidden', !isTool);
  visionBoxEl.classList.toggle('hidden', !isVision);
}

async function loadProviders() {
  const res = await fetch('/api/providers');
  if (!res.ok) throw new Error('Could not load providers.');
  const data = await res.json();
  providers = data.providers || {};
  if (!Object.keys(providers).length) throw new Error('No providers configured.');

  populateProviderOptions();

  if (!providers.groq?.capabilities?.[selectedCapability]) {
    selectedCapability = Object.keys(providers.groq?.capabilities || {})[0] || 'reasoning';
  }

  renderCapabilityTabs();
  populateModelOptions();
  updatePanelVisibility();
}

function selectedToolNames() {
  return Array.from(toolBoxEl.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
}

function extractBase64FromDataUrl(dataUrl) {
  return dataUrl.split(',')[1] || '';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function sendJsonRequest(endpoint, payload) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    const detail = data?.error || 'Request failed.';
    throw new Error(detail);
  }

  return data;
}

function applySuccessResult(payload, data, extra = {}) {
  setDebug(payload, data);
  setMetrics(data.metrics, data.requestMeta);

  setArtifacts({
    text: data.content || null,
    raw: data.raw || data,
    audio: data.audio || null,
    imageDataUrl: extra.imageDataUrl || null,
    meta: data.requestMeta || null
  });
}

async function handleTextSubmit(event) {
  event.preventDefault();

  const text = promptEl.value.trim();
  if (!text) return;

  const provider = providerEl.value;
  const model = modelEl.value;
  const capability = isGroqMode() ? selectedCapability : null;
  const temperature = Number(temperatureEl.value);

  conversation.push({ role: 'user', content: text });
  addMessage('user', text);

  sendBtn.disabled = true;
  addMessage('assistant', `Thinking... (${provider}/${model}${capability ? `/${capability}` : ''})`);

  const payload = {
    provider,
    model,
    temperature,
    capability,
    messages: [...conversation]
  };

  let visionDataUrl = null;

  if (capability === 'function_calling') {
    payload.tools = selectedToolNames();
  }

  if (capability === 'vision' && visionImageEl.files?.[0]) {
    visionDataUrl = await fileToDataUrl(visionImageEl.files[0]);
    payload.images = [{ dataUrl: visionDataUrl, fileName: visionImageEl.files[0].name }];
  }

  lastRequest = { endpoint: '/api/chat', payload };

  try {
    const data = await sendJsonRequest('/api/chat', payload);
    chatEl.lastChild.remove();
    const reply = data.content || '(Empty response)';
    addMessage('assistant', reply);
    conversation.push({ role: 'assistant', content: reply });

    applySuccessResult(payload, data, { imageDataUrl: visionDataUrl });

    if (Array.isArray(data.toolTrace) && data.toolTrace.length) {
      addMessage('system', `Tool calls: ${JSON.stringify(data.toolTrace, null, 2)}`);
    }
  } catch (err) {
    chatEl.lastChild.remove();
    addMessage('system', `Error: ${err.message}`);
  } finally {
    promptEl.value = '';
    sendBtn.disabled = false;
    promptEl.focus();
  }
}

async function handleSttSubmit(event) {
  event.preventDefault();

  const file = sttFileEl.files?.[0];
  if (!file) return;

  const dataUrl = await fileToDataUrl(file);
  const payload = {
    provider: 'groq',
    capability: 'speech_to_text',
    model: modelEl.value,
    audioBase64: extractBase64FromDataUrl(dataUrl),
    mimeType: file.type || 'audio/wav',
    fileName: file.name,
    language: sttLanguageEl.value.trim() || undefined,
    prompt: sttPromptEl.value.trim() || undefined
  };

  lastRequest = { endpoint: '/api/groq/stt', payload };
  addMessage('assistant', 'Transcribing audio...');

  try {
    const data = await sendJsonRequest('/api/groq/stt', payload);
    chatEl.lastChild.remove();
    addMessage('assistant', data.content || '(No transcript)');
    applySuccessResult(payload, data, {});
  } catch (err) {
    chatEl.lastChild.remove();
    addMessage('system', `Error: ${err.message}`);
  }
}

async function handleTtsSubmit(event) {
  event.preventDefault();

  const input = ttsInputEl.value.trim();
  if (!input) return;

  const payload = {
    provider: 'groq',
    capability: 'text_to_speech',
    model: modelEl.value,
    input,
    voice: ttsVoiceEl.value
  };

  lastRequest = { endpoint: '/api/groq/tts', payload };
  addMessage('assistant', 'Generating audio...');

  try {
    const data = await sendJsonRequest('/api/groq/tts', payload);
    chatEl.lastChild.remove();
    addMessage('assistant', data.content || 'Audio generated.');

    if (data.audio?.base64) {
      const src = `data:${data.audio.mimeType || 'audio/wav'};base64,${data.audio.base64}`;
      ttsAudioEl.src = src;
      ttsAudioEl.classList.remove('hidden');
    }

    applySuccessResult(payload, data, {});
  } catch (err) {
    chatEl.lastChild.remove();
    addMessage('system', `Error: ${err.message}`);
  }
}

async function retryLast() {
  if (!lastRequest) {
    addMessage('system', 'No previous request to retry.');
    return;
  }

  addMessage('assistant', 'Retrying last request...');

  try {
    const data = await sendJsonRequest(lastRequest.endpoint, lastRequest.payload);
    chatEl.lastChild.remove();
    addMessage('assistant', data.content || 'Retry complete.');
    applySuccessResult(lastRequest.payload, data, {});
  } catch (err) {
    chatEl.lastChild.remove();
    addMessage('system', `Retry error: ${err.message}`);
  }
}

providerEl.addEventListener('change', () => {
  populateModelOptions();
  renderCapabilityTabs();
  updatePanelVisibility();
  saveMemory();
  addMessage('system', `Switched provider to ${providers[providerEl.value]?.label || providerEl.value}.`);
});

modelEl.addEventListener('change', () => {
  if (isGroqMode()) {
    capabilityModelMemory[`${providerEl.value}:${selectedCapability}`] = modelEl.value;
  } else {
    providerModelMemory[providerEl.value] = modelEl.value;
  }
  saveMemory();
  updateTtsVoices();
});

visionImageEl.addEventListener('change', async () => {
  if (!visionImageEl.files?.[0]) {
    visionPreviewEl.classList.add('hidden');
    return;
  }

  const dataUrl = await fileToDataUrl(visionImageEl.files[0]);
  visionPreviewEl.src = dataUrl;
  visionPreviewEl.classList.remove('hidden');
});

chatForm.addEventListener('submit', handleTextSubmit);
sttForm.addEventListener('submit', handleSttSubmit);
ttsForm.addEventListener('submit', handleTtsSubmit);

clearBtn.addEventListener('click', () => {
  conversation.length = 1;
  chatEl.innerHTML = '';
  addMessage('system', 'Conversation cleared.');
});

retryBtn.addEventListener('click', retryLast);
sttRetryBtn.addEventListener('click', retryLast);
ttsRetryBtn.addEventListener('click', retryLast);

downloadTextBtn.addEventListener('click', () => {
  if (!lastArtifacts.text) return;
  downloadText(lastArtifacts.text, `${fileNameBase()}.txt`, 'text/plain;charset=utf-8');
});

downloadJsonBtn.addEventListener('click', () => {
  if (!lastArtifacts.raw) return;
  downloadText(JSON.stringify(lastArtifacts.raw, null, 2), `${fileNameBase()}.json`, 'application/json');
});

downloadAudioBtn.addEventListener('click', () => {
  if (!lastArtifacts.audio?.base64) return;
  const mime = lastArtifacts.audio.mimeType || 'audio/wav';
  const src = `data:${mime};base64,${lastArtifacts.audio.base64}`;
  const blob = dataUrlToBlob(src);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = lastArtifacts.audio.fileName || `${fileNameBase()}.wav`;
  a.click();
  URL.revokeObjectURL(url);
});

downloadImageBtn.addEventListener('click', () => {
  if (!lastArtifacts.imageDataUrl) return;
  const blob = dataUrlToBlob(lastArtifacts.imageDataUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileNameBase()}.png`;
  a.click();
  URL.revokeObjectURL(url);
});

copyTextBtn.addEventListener('click', async () => {
  if (!lastArtifacts.text) return;
  await navigator.clipboard.writeText(lastArtifacts.text);
});

copyJsonBtn.addEventListener('click', async () => {
  if (!lastArtifacts.raw) return;
  await navigator.clipboard.writeText(JSON.stringify(lastArtifacts.raw, null, 2));
});

(async function init() {
  loadMemory();
  addMessage('system', 'Loading providers...');
  resetArtifactButtons();

  try {
    await loadProviders();
    chatEl.innerHTML = '';
    addMessage('system', 'Ready. Select provider/model and test capabilities.');
    setDebug({}, {});
  } catch (err) {
    chatEl.innerHTML = '';
    addMessage('system', `Error: ${err.message}`);
  }
})();