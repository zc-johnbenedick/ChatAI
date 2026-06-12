# AI Support Desk

A professional, production-ready AI chat assistant built with **React 19**, **TypeScript**, and **Vite**. It features a polished, responsive chat interface with light/dark themes, conversation history, markdown-rendered responses, and persistence via Firebase Firestore + local storage.

## Features

- **Modern chat UI** — sidebar with conversation history, avatars, typing indicator, and a smooth empty state with suggested prompts.
- **Light & dark themes** — auto-detects system preference and remembers your choice.
- **Markdown answers** — assistant responses render lists, code, tables, and links (GitHub-flavored markdown).
- **Conversation history** — every chat is saved locally and synced to Firestore; revisit or delete past tickets.
- **Knowledge-base grounding** — relevant past tickets are matched locally and used to ground answers.
- **Web search fallback** — when similarity is below 0.78 or the question needs fresh data, the server fetches up-to-date context (DuckDuckGo, Wikipedia, optional Brave Search).
- **Dataset-accurate replies** — matched questions return steps directly from resolved tickets, with a brief friendly opener.
- **Responsive** — works on desktop and mobile (sidebar collapses into a drawer).

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`) and add your OpenRouter API key:

```env
VITE_OPENROUTER_API_KEY=your_api_key_here
VITE_OPENROUTER_MODEL=nex-agi/nex-n2-pro:free
```

Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).

3. Run the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  App.tsx              # Main chat application
  lib/knowledge.js           # Knowledge-base loader + matching (server-side)
  api/chat.js                # Vercel serverless chat endpoint
  src/
    lib/api.ts               # Client chat API caller
    assets/support_chat_resolved_records.json
  firebase.ts          # Firestore setup
  App.css, index.css   # Design system & styles
```

## Deploying to Vercel

Chat requests go through `/api/chat` (a Vercel serverless function). The API key is read **at runtime on the server**, not baked into the frontend build.

1. In Vercel → **Project Settings → Environment Variables**, add:
   - `OPENROUTER_API_KEY` — your key from [openrouter.ai/keys](https://openrouter.ai/keys)
   - `OPENROUTER_MODEL` — optional (defaults to `nex-agi/nex-n2-pro:free`)
   - `BRAVE_SEARCH_API_KEY` — optional, improves web search when knowledge-base similarity is low

   Your existing `VITE_OPENROUTER_API_KEY` also works — the server accepts either name.

2. **Redeploy** after adding or changing env vars (Deployments → ⋯ → Redeploy).

3. Enable env vars for **Production** (and Preview if you use preview URLs).

## Security note

The OpenRouter key stays on the server via `/api/chat`. It is never sent to the browser in production.

