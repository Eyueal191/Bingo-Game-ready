    

# Big Bingo Frontend

A modern React-based web client Telegram mini app (TMA) for Big Bingo, providing a fast, responsive, and engaging bingo experience with real-time gameplay, wallet management, and seamless manual payment integration.

## Features

- User registration, login, and play bingo
- Real-time bingo game rooms and winner detection
- Wallet: deposit (manual), withdraw
- Admin dashboard for user/game/transaction management
- Responsive UI with Material-UI and TailwindCSS
- Telegram bot integration for cross-platform play

## Tech Stack

- React 18
- Vite
- Material-UI (MUI)
- TailwindCSS
- Axios
- React Toastify
- ESLint/Prettier
- chart.js

## Getting Started

### Prerequisites

- Node.js v18+
- pnpm or npm

### Setup

```bash
cd client
pnpm install # or npm install
cp .env.example .env # and fill in VITE_APP_API_URL
```

### Development

```bash
pnpm run dev # or npm run dev
# App runs at http://localhost:5173
```

### Build for Production

```bash
pnpm run build # or npm run build
# Output in dist/
```

### Linting & Formatting

```bash
pnpm run lint # or npm run lint
```

### production preview

```bash
pnpm run preview # or npm run preview
# App runs at http://localhost:4173
```

## Environment Variables

- `VITE_APP_API_URL` — Backend API base URL (e.g., http://localhost:5000)

## Project Structure

- `src/components/` — Reusable UI components
- `src/pages/` — Page-level components (Login, Dashboard, GameRoom, Admin, etc.)
- `src/contexts/` — React Context providers (Auth, Wallet, Game, etc.)
- `src/styles/` — CSS/SCSS files
- `public/` — Static assets (images, icons, fonts)

## Contribution

- Use feature branches and open PRs for all changes
- Follow code style (ESLint/Prettier)
- Update documentation as needed

---

© 2025 Abyssinia Software Technology PLC. All rights reserved.

# API Client & Dependency Injection

## Centralized API Client

All REST API calls must use the injected `ApiClient` via the `useApi` hook. This enables:

- Centralized error handling (401/session expiry, network errors)
- Testability and maintainability
- No direct fetch/axios or inline URLs in components

## Usage

```js
import { useApi } from "../contexts/ApiContext";
const api = useApi();
const data = await api.get("/api/v1/route");
```

## Global Error Handling

- All API errors are handled globally via toast notifications.
- 401 errors (session expired) show a toast and can trigger logout.

## Extending

- Add new REST methods (put, delete, etc.) to `ApiClient` as needed.
- To handle global logout, extend the onError handler in `ApiProvider`.

## For Maintainers

- Never use fetch/axios directly in components.
- Always use the DI pattern for testability and future-proofing.
