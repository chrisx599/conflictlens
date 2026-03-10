# 🔍 ConflictLens — Relationship Conflict Coach

A relationship conflict coaching app that guides users through identifying conflict styles, reflecting on negative communication patterns, practicing healthier expression, and receiving personalized improvement reports.

**Built with:** React + Vite (frontend) · Python FastAPI (backend) · OpenAI API (LLM)

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.9 (with pip)
- **OpenAI API Key** (or compatible endpoint)

### 1. Clone & Install

```bash
git clone https://github.com/chrisx599/conflictlens.git
cd conflictlens

# Frontend dependencies
npm install

# Backend dependencies
pip install -r server/requirements.txt
```

### 2. Configure Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in your API key:

```env
LLM_API_KEY=sk-your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

> **Tip:** Any OpenAI-compatible API endpoint is supported — just change `LLM_BASE_URL` and `LLM_MODEL`.

### 3. Run

Open **two terminals**:

```bash
# Terminal 1 — Backend
uvicorn server.main:app --port 8000

# Terminal 2 — Frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Features

| Step | Feature | Description |
|------|---------|-------------|
| 1 | **Identify** | Describe a conflict + 10-question TKI assessment for both parties |
| 2 | **Reflect** | Read AI-generated dialogue with Gottman's Four Horsemen annotations |
| 3 | **Practice** | Rewrite negative expressions with NVC feedback and scoring |
| 4 | **Summary** | Personalized report with patterns, action plan, and communication toolkit |

- 🌐 **Bilingual** — Switch between 中文 / English in the top-right corner
- 🎨 **Dark theme** — Glassmorphism UI with smooth animations

---

## Project Structure

```
conflictlens/
├── server/                      # Python FastAPI backend
│   ├── main.py                  # App entry + CORS
│   ├── config.py                # Environment settings
│   ├── llm.py                   # OpenAI SDK wrapper
│   ├── prompts.py               # LLM prompt templates
│   └── routes/                  # API endpoints
│       ├── assessment.py        # POST /api/assess
│       ├── dialogue.py          # POST /api/dialogue/*
│       ├── practice.py          # POST /api/practice/*
│       └── summary.py           # POST /api/summary
├── src/                         # React frontend
│   ├── index.css                # Design system
│   ├── App.jsx                  # Root component
│   ├── i18n/translations.js     # zh/en translations
│   ├── context/                 # State & language context
│   ├── api/client.js            # API client
│   └── components/              # UI components (6 files)
├── index.html
├── package.json
└── vite.config.js               # Vite + API proxy
```

---

## License

MIT
