# AI Support Desk

A professional, production-ready AI chat assistant built with **React 19**, **TypeScript**, and **Vite**. It features a polished, responsive chat interface with light/dark themes, conversation history, markdown-rendered responses, and persistence via Firebase Firestore + local storage.

## Features

- **Modern chat UI** — sidebar with conversation history, avatars, typing indicator, and a smooth empty state with suggested prompts.
- **Light & dark themes** — auto-detects system preference and remembers your choice.
- **Markdown answers** — assistant responses render lists, code, tables, and links (GitHub-flavored markdown).
- **Conversation history** — every chat is saved locally and synced to Firestore; revisit or delete past tickets.
- **Knowledge-base grounding** — relevant past tickets are matched locally and used to ground answers.
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
  lib/api.ts           # OpenRouter request + knowledge-base matching
  components/Markdown.tsx
  assets/records.ts    # Local knowledge base
  firebase.ts          # Firestore setup
  App.css, index.css   # Design system & styles
```

## Security note

Because this is a client-side app, any `VITE_*` value (including the API key) is bundled into the browser. For a hardened production deployment, proxy requests through a backend so the key never reaches the client. A starter Express proxy is included in `server.js` — run it with an `OPENROUTER_API_KEY` environment variable and point the frontend at it.
"# ChatAI" 
