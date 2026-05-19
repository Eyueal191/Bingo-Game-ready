# Ludo Game — End-to-End Technical Code Walkthrough

**Version:** 1.0 | **Last Updated:** April 2026 | **Author:** Samuel Aberra

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Backend Architecture](#2-backend-architecture)
3. [Database Models](#3-database-models)
4. [Game Logic Engine](#4-game-logic-engine)
5. [Service Layer](#5-service-layer)
6. [Socket.IO Real-Time Layer](#6-socketio-real-time-layer)
7. [REST API Layer](#7-rest-api-layer)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Frontend Pages & Components](#9-frontend-pages--components)
10. [Board Rendering & Animation](#10-board-rendering--animation)
11. [Sound System](#11-sound-system)
12. [Admin Dashboard](#12-admin-dashboard)
13. [Complete Data Flow](#13-complete-data-flow)
14. [Game Rules Implementation](#14-game-rules-implementation)
15. [Error Handling & Edge Cases](#15-error-handling--edge-cases)
16. [File Index](#16-file-index)

---

## 1. System Overview

The Ludo game is a real-time multiplayer board game supporting 2-player (1v1) and 4-player modes with three game variants: **Sprint** (1 token), **Quick** (2 tokens), and **Classic** (4 tokens). The system uses a **server-authoritative architecture** — all game logic runs on the backend. The frontend is a thin client that renders state and emits user actions via Socket.IO.

### Communication Pattern

```
Frontend (React)                    Backend (Node.js)
────────────────                    ─────────────────
Socket.IO Events ──────────────────► Socket Handlers
                   ◄────────────────  State Broadcasts
REST API Calls   ──────────────────► Controllers (admin only)
                   ◄────────────────  JSON Responses
```

### Key Design Decisions

- **Server-authoritative**: Dice rolls use `crypto.randomInt()` (CSPRNG), not client-side `Math.random()`. All moves validated server-side.
- **MongoDB Transactions**: Stakes, payouts, and refunds use multi-document ACID transactions.
- **Change Streams**: Room list updates pushed via MongoDB Change Streams on `ludo_rooms` collection.
- **Turn Timer**: 15-second turn timeout enforced server-side with in-memory `setTimeout`.
- **Forfeit System**: 3 consecutive timeouts → automatic forfeit. Last player standing wins.

---

## 2. Backend Architecture

```
server/
├── models/
│   ├── LudoRoom.js          # Room/lobby model
│   └── LudoGame.js          # Active game state model
├── utils/
│   └── ludoGameLogic.js     # Pure functional game engine
├── services/
│   └── ludoService.js       # Business logic (transactions, wallet)
├── socketController/
│   └── ludoSocket.js        # Socket.IO event handlers + timers
├── controllers/
│   └── ludoRoomController.js # REST API controllers (admin)
└── routes/
    └── ludoRoomRoutes.js    # Express route definitions
```

### Dependency Chain

```
ludoRoomRoutes.js → ludoRoomController.js → ludoService.js
                                            ├── ludoGameLogic.js (pure)
                                            ├── walletService.js
                                            ├── LudoRoom / LudoGame / GameTransaction (models)

ludoSocket.js → ludoService.js + ludoGameLogic.js + LudoRoom + LudoGame
```

---

## 3. Database Models

### 3.1 LudoRoom (`server/models/LudoRoom.js`)

Collection: `ludo_rooms`. Represents a game room in the lobby.

| Field | Type | Description |
|-------|------|-------------|
| `stakeAmount` | Number (required) | Bet amount per player |
| `mode` | String enum | `"classic"` / `"quick"` / `"sprint"` |
| `playerCount` | Number enum | `2` or `4` |
| `status` | String enum | `"waiting"` → `"full"` → `"playing"` → `"ended"` / `"cancelled"` |
| `players[]` | Sub-doc array | `{ userId, color, status, joinedAt }` |
| `commissionPercent` | Number | Default 20 |
| `winnerUserId` | ObjectId | Set on game end |
| `winAmount` | Number | Calculated: `(stake × players) - commission` |
| `creatorUserId` | ObjectId | Room creator |
| `gameId` | ObjectId → LudoGame | Set when game starts |
| `refundProcessed` | Boolean | Idempotency guard for refunds |

**Indexes:** `{ stakeAmount, mode, status }`, `{ status }`, `{ "players.userId" }`

### 3.2 LudoGame (`server/models/LudoGame.js`)

Collection: `ludo_games`. Active game state. Created when room becomes full.

| Field | Type | Description |
|-------|------|-------------|
| `roomId` | ObjectId → LudoRoom (indexed) | Parent room |
| `mode` | String enum | Game mode |
| `players[]` | Sub-doc array | `{ userId, color, tokens[], forfeited, consecutiveTimeouts }` |
| `players[].tokens[]` | Sub-doc | `{ id, position, isHome, isFinished }` |
| `currentTurnIndex` | Number | Index into players array |
| `currentDiceValue` | Number | Last dice value |
| `diceRolled` | Boolean | Has current player rolled? |
| `consecutiveSixes` | Number | Counter for 3-six forfeit rule |
| `diceRolls[]` | Array | Audit log of all rolls |
| `moves[]` | Array | Audit log of all moves with captures |
| `winnerUserId` | ObjectId | Set on game end |
| `status` | String enum | `"playing"` / `"ended"` / `"aborted"` |
| `turnTimerSeconds` | Number | Default 15 |

**Token position semantics:**
- `position: 0` → In home base (not on board)
- `position: 1–52` → On main track
- `position: 111–115, 221–225, 331–335, 441–445` → In home column
- `position: -1` → Finished (reached end of home column)

---

## 4. Game Logic Engine

**File:** `server/utils/ludoGameLogic.js`

Pure functional, server-authoritative engine. No I/O side effects. All functions take state as input and return new state.

### 4.1 Board Layout

The board uses a cell-numbering system:
- **1–52**: Main circular track (shared by all colors, wraps 52→1)
- **111–115**: Red home column | **221–225**: Green | **331–335**: Yellow | **441–445**: Blue
- **0**: Home base (off-board)

| Type | Cells | Purpose |
|------|-------|---------|
| Starting points | `[1, 14, 27, 40]` | Token entry to main track |
| Turning points | `[51, 12, 25, 38]` | Arrow cells — turn into home column |
| Star spots | `[9, 22, 35, 48]` | Safe — no capture |
| Safe spots | Starting + Star + All home columns | No capture allowed |

### 4.2 Color Configuration

```javascript
const colorConfig = {
    red:    { startPos: 1,  turningPoint: 51, homeColumn: [111-115] },
    green:  { startPos: 14, turningPoint: 12, homeColumn: [221-225] },
    yellow: { startPos: 27, turningPoint: 25, homeColumn: [331-335] },
    blue:   { startPos: 40, turningPoint: 38, homeColumn: [441-445] },
};
```

### 4.3 Core Functions

#### `rollDice()` → `crypto.randomInt(1, 7)` — CSPRNG dice roll

#### `createInitialState(players, mode)` — Token count per mode:
- Sprint: 1, Quick: 2, Classic: 4. All start at position 0, `isHome: true`.

#### `getNextPosition(currentPos, steps, color)` — Path calculation:
1. **Home base** (pos=0): Only moves on 6 → lands on `startPos`
2. **Main track**: Walks forward, wraps 52→1. At turning point, diverts into home column
3. **Home column**: Moves forward. Returns `-1` if exactly at finish, `null` if overshoot

#### `getValidMoves(gameState, playerIndex, diceValue)` → `[{ tokenId, from, to }]`
Skips finished tokens and tokens that can't legally move.

#### `applyMove(gameState, playerIndex, tokenId, diceValue)` → `{ captured, capturedInfo, from, to }`
Applies move, checks captures on main track (not on safe spots). Captured tokens sent to home base.

#### `checkWinCondition(gameState, playerIndex)` → All tokens `isFinished`?

#### `getNextTurn(gameState, diceValue, captured, finished)` — Turn advancement:

| Condition | Result |
|-----------|--------|
| 3 consecutive sixes | Turn forfeited, next player |
| Rolled 6 (< 3 consecutive) | Extra turn |
| Captured token | Extra turn |
| Token finished | Extra turn |
| Normal | Next player (skip forfeited/finished) |

#### `assignColors(playerCount)` — 2P: `["blue","green"]`, 4P: `["red","green","yellow","blue"]`

#### `calculatePayout(stake, players, commission%)` — `winAmount = (stake × players) - commission`

---

## 5. Service Layer

**File:** `server/services/ludoService.js`

Handles all database I/O, transactions, and wallet operations.

### 5.1 `createRoom({ userId, stakeAmount, mode, playerCount })` — Transaction

1. Validate inputs + check `AppConfig.ludo` (allowed stakes, enabled modes)
2. Check user not already in active room
3. **Transaction**: verify balance → deduct via `walletService.deductForGame()` → create `LudoRoom` → record `GameTransaction(STAKE)`
4. Returns room document

### 5.2 `joinRoom({ userId, roomId, ... })` — Transaction

1. Check not already in active room
2. If `roomId`: join specific room. Else: quick-match (FIFO oldest waiting room matching criteria)
3. **Transaction**: verify balance → deduct → assign next color → if full set `status="full"` → record `GameTransaction(STAKE)`

### 5.3 `startGame(roomId)` — Transaction

Called by socket when room is full. **Transaction**: verify all players → create `LudoGame` from `ludoLogic.createInitialState()` → set room `status="playing"`, `gameId`, `startedAt`.

### 5.4 `processWinPayout(roomId, winnerUserId)` — Transaction

**Transaction**: calculate payout → credit winner via `walletService.creditWin()` → record `GameTransaction(WIN)` → set room/game `status="ended"`.

### 5.5 `cancelRoom(roomId, reason)` — Transaction

Idempotency guard (`refundProcessed`). **Transaction**: refund all players → record `GameTransaction(REFUND)` each → abort game if active → set `status="cancelled"`.

### 5.6 Query Functions

| Function | Description |
|----------|-------------|
| `getAvailableRooms(filters)` | Waiting rooms, populated, limit 50 |
| `getAllRooms(filters)` | All rooms (admin), limit 100 |
| `getRoomById(roomId)` | Single room with player details |

---

## 6. Socket.IO Real-Time Layer

**File:** `server/socketController/ludoSocket.js`

Primary communication channel for gameplay.

### 6.1 In-Memory Timers

```javascript
const turnTimers = new Map();        // roomId → 15s turn setTimeout
const disconnectTimers = new Map();  // "roomId:userId" → 30s grace setTimeout
const roomTimeouts = new Map();      // roomId → 5min room timeout setTimeout

TURN_TIMEOUT_MS = 15000;             // 15s per turn
DISCONNECT_GRACE_MS = 30000;         // 30s reconnect window
ROOM_WAIT_TIMEOUT_MS = 300000;       // 5min waiting room expiry
MAX_CONSECUTIVE_TIMEOUTS = 3;        // Forfeit threshold
```

### 6.2 Change Streams

On init, two MongoDB Change Streams are established:
- **LudoRoom watch**: Any change → broadcasts `ludo:rooms` to all clients
- **AppConfig watch**: Config change → broadcasts `ludo:settings` with Ludo config

### 6.3 Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ludo:get_rooms` | `filters?` | Request room list |
| `ludo:create_room` | `{ stakeAmount, mode, playerCount, userId }` | Create room |
| `ludo:join_room` | `{ roomId, userId, ... }` | Join/quick-match |
| `ludo:dice_roll` | `{ roomId, userId }` | Roll dice |
| `ludo:move_token` | `{ roomId, userId, tokenId }` | Move token |
| `ludo:check_active_game` | `{ userId }` | Check for active game |
| `ludo:cancel_room` | `{ roomId, userId }` | Cancel waiting room |
| `ludo:rejoin` | `{ roomId, userId }` | Rejoin after disconnect |

### 6.4 Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ludo:rooms` | `Room[]` | Available room list |
| `ludo:room_created` | `{ roomId, stakeAmount, ... }` | Room creation confirmed |
| `ludo:room_update` | `{ roomId, players, status, ... }` | Room state change |
| `ludo:game_start` | `{ roomId, players, currentTurnIndex, ... }` | Game started |
| `ludo:game_state` | Full state | Full state on rejoin |
| `ludo:dice_result` | `{ userId, value, validMoves }` | Dice result + valid moves |
| `ludo:token_moved` | `{ userId, tokenId, from, to, captured, players }` | Token moved |
| `ludo:turn_change` | `{ currentTurnIndex, currentPlayerUserId, ... }` | Turn changed |
| `ludo:game_end` | `{ winnerUserId, winAmount, ... }` | Game ended |
| `ludo:room_cancelled` | `{ roomId, reason }` | Room cancelled |
| `ludo:player_forfeited` | `{ userId, color, reason }` | Player forfeited |
| `ludo:player_counts` | `{ count2p, count4p }` | Active player counts |
| `ludo:settings` | `LudoConfig` | Admin config update |
| `ludo:error` | `{ message }` | Error |
| `walletUpdate` | `{ wallet, bonus }` | Wallet change (shared event) |

### 6.5 Key Event Flows

#### `ludo:create_room`
```
validate → ludoService.createRoom() → socket.join() → emit room_created
→ broadcast rooms → set 5min room timeout
```

#### `ludo:join_room`
```
validate → ludoService.joinRoom() → socket.join() → emit room_update
→ broadcast rooms → if full: clear timeout, 1.5s delay → startLudoGame()
```

#### `ludo:dice_roll`
```
load game → validate turn → rollDice() (CSPRNG) → save to DB
→ getValidMoves() → clear timer → emit dice_result
→ if no valid moves: auto-advance 1.5s → else: start 15s timer
```

#### `ludo:move_token`
```
load game → validate turn + move in validMoves → applyMove()
→ record move → check win → if won: processWinPayout() + emit game_end
→ else: getNextTurn() → save → emit token_moved + turn_change → start timer
```

#### `ludo:rejoin`
```
socket.join() → clear disconnect timer → load room
→ if playing: load game + validMoves → emit game_state
→ if ended: emit game_end → if cancelled: emit room_cancelled
```

### 6.6 Forfeit System

When turn times out (`autoAdvanceTurn`):
1. Increment `consecutiveTimeouts` for timed-out player
2. If ≥ 3: mark all tokens finished, emit `ludo:player_forfeited`
3. Check if only one active player remains → they win
4. Otherwise: advance turn (skip forfeited), emit `ludo:turn_change`

### 6.7 Disconnect Handler

On socket disconnect: set 30s grace timer → check if reconnected on different socket → if not and was their turn: auto-advance.

### 6.8 Startup Recovery

`recoverOrphanedRooms()`: On server start, cancels and refunds any rooms stuck in `"waiting"` status older than 5 minutes from previous server lifecycle.

---

## 7. REST API Layer

**File:** `server/routes/ludoRoomRoutes.js`

Primarily for admin. Gameplay uses Socket.IO.

### Player Routes (Authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ludo/rooms/create` | Create room |
| POST | `/api/v1/ludo/rooms/join` | Join room |
| GET | `/api/v1/ludo/rooms` | List available rooms |
| GET | `/api/v1/ludo/rooms/:roomId` | Get room details |

### Admin Routes (Authenticated + Admin)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ludo/rooms/:roomId/cancel` | Cancel any room |
| GET | `/api/v1/ludo/admin/rooms` | Paginated room list |
| GET | `/api/v1/ludo/admin/games/:roomId` | Game details by room |
| GET | `/api/v1/ludo/admin/stats` | Aggregate statistics |

Admin stats uses MongoDB aggregation on `LudoRoom` to compute `totalStaked`, `totalWon`, `totalCommission`.

---

## 8. Frontend Architecture

```
client/src/
├── pages/ludo/
│   ├── LudoLobby.jsx         # Room listing + game creation
│   ├── LudoGame.jsx          # Main game screen (orchestrator)
│   ├── LudoBoard.jsx         # Board grid + token rendering + animation
│   ├── LudoDice.jsx          # Dice with Lottie animation
│   ├── LudoWaiting.jsx       # Waiting screen
│   ├── LudoWinnerModal.jsx   # Win/loss modal
│   └── useLudoSound.js       # Sound hook (Howler.js)
├── pages/admin/ludo/
│   └── LudoAdminDashboard.jsx
├── styles/ludo.css
└── constants/featuredGames.js  # Game center cards
```

### Routes

| Path | Component | Auth |
|------|-----------|------|
| `/ludo` | → `/ludo/2` | — |
| `/ludo/:playerCount` | `LudoLobby` | Protected |
| `/ludo/game/:roomId` | `LudoGame` | GuestRestricted |
| `/ludo-admin-dash` | `LudoAdminDashboard` | Admin |

### Context Dependencies

| Context | Used In | Purpose |
|---------|---------|---------|
| `AuthContext` | Lobby, Game | User `_id` for socket events |
| `socketContext` | Lobby, Game | Socket.IO client |
| `WalletContext` | Lobby | Balance check |
| `AppConfigContext` | Lobby | Admin stakes/modes/commission |

---

## 9. Frontend Pages & Components

### 9.1 LudoLobby (`pages/ludo/LudoLobby.jsx`)

Entry point for players. Handles:
- **Room listing**: Subscribes to `ludo:rooms`, displays cards with stake/mode/win info
- **Game creation**: "Play Now" → emits `ludo:create_room` → navigates on `ludo:room_created`
- **Room joining**: "Join" button → emits `ludo:join_room`
- **Active game detection**: `ludo:check_active_game` → rejoin banner with cancel option
- **Admin config sync**: Reads `AppConfigContext.ludo` + `ludo:settings` for stakes/modes

Key state: `rooms[]`, `selectedStake`, `mode`, `activeGame`, `stakes[]`, `enabledModes`

### 9.2 LudoGame (`pages/ludo/LudoGame.jsx`)

Main game orchestrator. Manages complete game lifecycle:

Key state: `gameState`, `validMoves[]`, `winner`, `isWaiting`, `turnTimer`, `isRolling`, `moveHistory[]`

Socket subscriptions: `room_update`, `game_start`, `game_state`, `dice_result`, `token_moved`, `turn_change`, `game_end`, `player_forfeited`, `room_cancelled`

Derived: `myColor` = find player matching userId, `isMyTurn` = currentPlayer matches userId

Client-side turn timer: cosmetic 15s countdown (server enforces actual timeout)

### 9.3 LudoWaiting (`pages/ludo/LudoWaiting.jsx`)

Waiting screen: player slots + empty placeholders, room info chips, progress bar, cancel button (creator only with confirmation).

### 9.4 LudoWinnerModal (`pages/ludo/LudoWinnerModal.jsx`)

Victory/defeat overlay: Trophy/Firework Lottie animations, win/loss amount, mode tag, "Play Again" and "Back to Home" buttons.

---

## 10. Board Rendering & Animation

**File:** `client/src/pages/ludo/LudoBoard.jsx`

Renders a 15×15 CSS grid with animated token movements.

### 10.1 Grid Layout

`buildCellMap()` maps cell IDs → `{ row, col }` on 15×15 grid from `PlotData` arrays.

| Area | Grid Region | CSS Class |
|------|-------------|-----------|
| Home bases | 6×6 corners | `home-red/green/blue/yellow` |
| Main track | Cross path | `ludo-cell` + modifiers |
| Home columns | Color cells | `home-col-red` etc. |
| Center | 3×3 center | `center-home` |

### 10.2 Token Positioning

Tokens are absolutely positioned using pixel coords from `cellSize` (board width ÷ 15):

```javascript
getTokenPosition(token, color, key):
  if isFinished  → center triangle sector
  if animating   → animPositions[key] cell
  if isHome      → HOME_TOKEN_POSITIONS[color][tokenId]
  else           → CELL_MAP[token.position]
  return { left: (col+0.5)*cellSize, top: (row+0.5)*cellSize }
```

### 10.3 Step-by-Step Animation

`computePath(fromPos, toPos, color)` calculates cell sequence between positions.

**Forward moves**: `setInterval` every 150ms updates `animPositions` one cell at a time, playing `pile_move` sound each step.

**Captures**: Delayed until capturer finishes, then CSS transition slides captured token back to base.

**Same-cell stacking**: Tokens on the same cell get ±10% cellSize offset to prevent overlap.

### 10.4 Movable Token Highlighting

When `isMyTurn && validMoves.includes(tokenId)`: token gets `ludo-token--clickable` class with color-specific pulse animation via CSS `--pulse-color` variable.

---

## 11. Sound System

**File:** `client/src/pages/ludo/useLudoSound.js`

Uses Howler.js with global cache and per-event debouncing.

| Event Key | SFX File | Used In |
|-----------|----------|---------|
| `dice_roll` | `/sfx/dice_roll.ogg` | LudoDice |
| `game_start` | `/sfx/yx_StartGame.ogg` | LudoGame |
| `collide` | `/sfx/yx_Kick.ogg` | Capture |
| `home_win` | `/sfx/yx_Final.ogg` | Token finish |
| `pile_move` | `/sfx/yx_Start.ogg` | Step animation |
| `safe_spot` | `/sfx/yx_Safety.ogg` | Landing on safe |
| `cheer` | `/sfx/yx_Victory.ogg` | Winner modal |
| `lose` | `/sfx/yx_Kick.ogg` | Loser modal |
| `ui` | `/sfx/ui.mp3` | Turn change |

Debounce: `pile_move` = 120ms, others = 50ms. Global `howlCache` prevents duplicate Howl instances.

---

## 12. Admin Dashboard

**File:** `client/src/pages/admin/ludo/LudoAdminDashboard.jsx`

MUI-based admin panel with two sections:

**Dashboard**: Stats cards (total rooms, active, completed, cancelled, total staked, total won, commission, avg per game) + revenue breakdown.

**Rooms Table**: Paginated, filterable by status. Columns: Room ID, Stake, Mode, Players, Status (Chip), Winner, Win Amount, Created, Actions (Cancel button).

API calls: `GET /api/v1/ludo/admin/stats`, `GET /api/v1/ludo/admin/rooms`, `POST /api/v1/ludo/rooms/:id/cancel`

**Admin Settings** (`LudoSection.jsx`): Configures allowed stake amounts, commission %, mode enable/disable toggles. Saved via `AppConfig` model.

---

## 13. Complete Data Flow

### Full Game Lifecycle

```
1. USER OPENS LOBBY
   LudoLobby mounts → socket.emit("ludo:get_rooms")
                     → socket.emit("ludo:check_active_game")
   Server: Change Streams push room list + config

2. USER CREATES ROOM
   LudoLobby: "Play Now" → socket.emit("ludo:create_room", { stakeAmount, mode, playerCount, userId })
   Server: ludoService.createRoom() [TRANSACTION: deduct + create room + record stake]
         → socket.emit("ludo:room_created") → navigate to /ludo/game/:roomId
         → LudoWaiting renders → socket.emit("ludo:rejoin")
         → Server emits "ludo:room_update" with room data

3. OPPONENT JOINS
   Opponent: "Join" → socket.emit("ludo:join_room")
   Server: ludoService.joinRoom() [TRANSACTION: deduct + add player]
         → If full: status="full" → 1.5s delay → startLudoGame()
         → ludoService.startGame() [TRANSACTION: create LudoGame]
         → socket.emit("ludo:game_start") to all in room
         → LudoGame exits waiting, renders board

4. PLAYER ROLLS DICE
   LudoGame: "Roll" → socket.emit("ludo:dice_roll", { roomId, userId })
   Server: validate turn → crypto.randomInt(1,7) → save to DB
         → getValidMoves() → socket.emit("ludo:dice_result", { value, validMoves })
         → Client: LudoDice shows Lottie animation + result
         → If no valid moves: 1.5s delay → autoAdvanceTurn()

5. PLAYER MOVES TOKEN
   LudoGame: token click → socket.emit("ludo:move_token", { roomId, userId, tokenId })
   Server: validate move → applyMove() → check captures
         → checkWinCondition()
         → If won: processWinPayout() [TRANSACTION] → emit game_end
         → Else: getNextTurn() → emit token_moved + turn_change
         → Client: LudoBoard animates step-by-step → plays sound

6. GAME ENDS
   Server: emit "ludo:game_end" → emit walletUpdate to all players
   Client: LudoWinnerModal renders → Lottie trophy/fireworks → sound effects

7. DISCONNECT / REJOIN
   On disconnect: 30s grace timer → if not reconnected: auto-advance
   On refresh: LudoGame mounts → socket.emit("ludo:rejoin") → server sends full game_state
```

---

## 14. Game Rules Implementation

| Rule | Implementation |
|------|---------------|
| Roll 6 to leave base | `getNextPosition()`: returns `null` if `position===0 && steps!==6` |
| Extra turn on 6 | `getNextTurn()`: keeps `currentTurnIndex` same, resets `diceRolled` |
| 3 consecutive 6s = forfeit turn | `getNextTurn()`: if `consecutiveSixes >= 3`, advance to next player |
| Extra turn on capture | `getNextTurn()`: if `captured`, keep same turn |
| Extra turn on token finish | `getNextTurn()`: if `finished`, keep same turn |
| Safe spots (no capture) | `applyMove()`: checks `!SafeSpots.includes(newPos)` before capture |
| Overshoot home column = no move | `getNextPosition()`: returns `null` if steps exceed home column |
| Exact finish required | `getNextPosition()`: returns `-1` only if exactly at end |
| Forfeit after 3 timeouts | `autoAdvanceTurn()`: marks all tokens finished after 3 consecutive timeouts |
| Last player standing wins | After forfeit: check `activePlayers.length <= 1` → process win |

---

## 15. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Double-join attempt | `ludoService`: checks existing active room before join |
| Move while not your turn | Socket handler: validates `currentPlayer.userId === userId` |
| Roll after already rolled | Socket handler: checks `game.diceRolled` flag |
| Invalid token selection | Socket handler: validates `tokenId` is in `validMoves` |
| Room timeout (5min) | `roomTimeouts` map: auto-cancel + refund |
| Player disconnect | 30s grace → check reconnection → auto-advance if needed |
| Server restart | `recoverOrphanedRooms()`: cancels stale waiting rooms |
| Double refund | `refundProcessed` flag on LudoRoom (idempotency) |
| Insufficient balance | `ludoService`: checks `wallet + bonus >= stakeAmount` before deduction |
| Admin disables mode mid-game | Only affects new room creation; active games continue |
| Change stream errors | Error handler resets `isWatching` flag, allowing re-initialization |

---

## 16. File Index

### Backend

| File | Lines | Purpose |
|------|-------|---------|
| `server/models/LudoRoom.js` | 79 | Room/lobby Mongoose model |
| `server/models/LudoGame.js` | 110 | Game state Mongoose model |
| `server/utils/ludoGameLogic.js` | 414 | Pure functional game engine |
| `server/services/ludoService.js` | 446 | Business logic + transactions |
| `server/socketController/ludoSocket.js` | 946 | Socket.IO handlers + timers |
| `server/controllers/ludoRoomController.js` | 233 | REST API controllers |
| `server/routes/ludoRoomRoutes.js` | 19 | Express route definitions |

### Frontend

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/pages/ludo/LudoLobby.jsx` | 405 | Lobby/room listing |
| `client/src/pages/ludo/LudoGame.jsx` | 441 | Game orchestrator |
| `client/src/pages/ludo/LudoBoard.jsx` | 372 | Board grid + animation |
| `client/src/pages/ludo/LudoDice.jsx` | 94 | Dice with Lottie |
| `client/src/pages/ludo/LudoWaiting.jsx` | 179 | Waiting screen |
| `client/src/pages/ludo/LudoWinnerModal.jsx` | 118 | Win/loss modal |
| `client/src/pages/ludo/useLudoSound.js` | 85 | Sound hook |
| `client/src/pages/admin/ludo/LudoAdminDashboard.jsx` | 364 | Admin dashboard |
| `client/src/styles/ludo.css` | — | All Ludo styles |
