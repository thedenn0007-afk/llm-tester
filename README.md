# Multi-Provider LLM Capability Tester

Clean local playground with multiple providers. When you select **Groq**, the UI switches to capability mode with tabs for:

- Reasoning
- Function Calling / Tool Use (preset mock tools)
- Text to Text
- Vision
- Speech to Text
- Text to Speech
- Multilingual
- Safety

It also includes:

- capability-filtered model switching
- raw request/response debug panel
- latency/usage metrics
- retry last request
- per-output downloads (`.txt`, `.json`, audio, image)

## Setup

1) Create `.env` from template:

```powershell
Copy-Item .env.example .env
```

2) Fill keys in `.env`:

- `ZAI_API_KEY`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`

3) Start:

```powershell
npm start
```

Open: [http://localhost:3000](http://localhost:3000)

## API routes

- `GET /api/providers`
- `POST /api/chat`
- `POST /api/groq/stt`
- `POST /api/groq/tts`

## Notes

- `.env` is auto-loaded by server startup.
- Non-Groq providers keep normal chat flow.
- Groq STT/TTS use dedicated routes; text capabilities use `/api/chat`.