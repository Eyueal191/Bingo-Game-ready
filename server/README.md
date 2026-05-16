# Big Bingo Backend

Node.js/Express backend for Big Bingo, powering real-time bingo games, wallet/payment APIs, Telegram bot integration, and admin management.

## Features

- RESTful API for all game, wallet, and user operations
- Real-time game logic with Socket.io
- Telegram bot integration for user interaction and manual payments
- manual payment with receipt support
- Admin endpoints for user/game/transaction management
- JWT authentication and role-based access
- Dockerized for easy deployment

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose (ODM)
- Socket.io
- node-telegram-bot-api
- Addispay SDK
- Winston, Zod, Multer, Helmet, CORS

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB
- pnpm or npm

### Setup

```bash
cd server
pnpm install # or npm install
cp .env.example .env # and fill in all required values
```

### Development

```bash
pnpm run dev # or npm run dev
# API runs at http://localhost:5000
```

### Production

- Use Docker Compose (see project root)
- Or run `npm start` or `pm2 strat index.js`

## Environment Variables

- `PORT`, `MONGOURL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `BOT_USERNAME`, etc. (see docs/technical-documentation.md)

## Project Structure

- `controllers/` — API and business logic
- `models/` — Mongoose schemas
- `routes/` — Express route definitions
- `middlewares/` — Auth, validation, file upload, etc.
- `botController/` — Telegram bot commands and handlers
- `services/` — Business logic modules
- `socketController/` — Real-time event handlers
- `uploads/` — Uploaded receipts/files
- `utils/` — Logging, helpers

## API & Bot

- See [docs/technical-documentation.md](../docs/technical-documentation.md) for full API and bot command documentation

## Contribution

- Use feature branches and open PRs for all changes
- Follow code style and add JSDoc for exported functions
- Update documentation as needed

---

© 2025 Abyssinia Software Technology PLC. All rights reserved.
