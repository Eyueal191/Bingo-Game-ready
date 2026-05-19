# Haywin Games Documentation

**Complete Technical Documentation Index**  
**Version:** 1.0 | **Last Updated:** April 2026

---

## Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[Root README](../README.md)** | Project overview, quick start | Everyone |
| **[Handover Guide](HAYWIN_GAMES_HANDOVER.md)** | Complete platform documentation | New engineering team |
| **[API Reference](HAYWIN_GAMES_API_DOCUMENTATION.md)** | All 196 REST + WebSocket endpoints | Frontend devs, API consumers |
| **[Postman Guide](POSTMAN.md)** | Testing with Postman | QA, Developers |
| **[Server README](../server/README.md)** | Backend-specific docs | Backend developers |
| **[Client README](../client/README.md)** | Frontend-specific docs | Frontend developers |

---

## Documentation Map

```
Haywin Games Documentation
│
├── 📁 docs/
│   ├── README.md (This file - Navigation)
│   ├── HAYWIN_GAMES_HANDOVER.md (Complete platform docs)
│   ├── HAYWIN_GAMES_API_DOCUMENTATION.md (196 endpoints)
│   ├── POSTMAN.md (Testing guide)
│   └── HaywinGames.postman.json (collection + environment)
│
├── 📁 server/
│   └── README.md (Backend docs)
│
├── 📁 client/
│   └── README.md (Frontend docs)
│
└── README.md (Root project overview)
```

---

## Document Details

### 1. Root README.md
**Location:** `../README.md`

**Contains:**
- Executive summary of Haywin Games platform
- System architecture overview
- Tech stack details
- Project structure
- Database design
- Quick setup instructions
- Handover checklist

**Best for:** First-time readers, project overview

---

### 2. HAYWIN_GAMES_HANDOVER.md
**Location:** `HAYWIN_GAMES_HANDOVER.md`

**Contains:**
1. Executive Overview
2. System Architecture (with Mermaid diagrams)
3. Tech Stack
4. Platform Architecture (Multi-game support)
5. Project Structure
6. Database Design (ERD)
7. API Documentation
8. Game Engine & Logic
9. Frontend Architecture
10. Authentication & Authorization
11. Wallet & Transaction System
12. Setup & Installation Guide
13. Testing Strategy
14. Deployment Guide
15. Monitoring & Logging
16. Handover Notes (Critical)
17. Future Improvements
18. Operational Runbooks
19. Ownership Matrix

**Best for:** Complete technical understanding, new team onboarding

---

### 3. HAYWIN_GAMES_API_DOCUMENTATION.md
**Location:** `HAYWIN_GAMES_API_DOCUMENTATION.md`

**Contains:**
- All 196 API endpoints documented
- Request/response examples
- WebSocket event documentation
- Error codes reference
- Rate limiting information
- Postman collection guide
- Data models appendix

**Sections:**
1. API Conventions
2. Environment Setup
3. Health & Status
4. Authentication (17 endpoints)
5. Users (15 endpoints)
6. Bingo Domain (38 endpoints)
7. Keshkesh (7 endpoints)
8. Spin (7 endpoints)
9. Material Lottery (9 endpoints)
10. Ludo (8 endpoints)
11. Wallet & Transactions (13 endpoints)
12. Payments (19 endpoints)
13. Admin/Config (31 endpoints)
14. Utilities (24 endpoints)
15. WebSocket Events
16. Error Reference
17. Rate Limit & Security
18. Postman Collection Guide

**Best for:** API integration, frontend development, testing

---

### 4. POSTMAN.md
**Location:** `POSTMAN.md`

**Contains:**
- Import instructions
- Environment setup
- Authentication workflow
- Endpoint organization
- Testing tips

**Best for:** QA engineers, API testing

---

### 5. Server README.md
**Location:** `../server/README.md`

**Contains:**
- Backend tech stack
- Project structure
- Architecture diagrams
- Key components (Auth, Wallet, Games)
- API endpoints summary
- Socket.IO events
- Database schema
- Setup instructions
- Scripts
- Deployment guide
- Troubleshooting

**Best for:** Backend developers, DevOps

---

### 6. Client README.md
**Location:** `../client/README.md`

**Contains:**
- Frontend tech stack
- Project structure
- Architecture (State, Context)
- Routes documentation
- Game components
- Styling approach
- Forms (React Hook Form + Zod)
- API integration pattern
- Scripts
- Browser support
- Performance optimization

**Best for:** Frontend developers, UI engineers

---

## Postman Assets

### Files
- **Merged Collection:** `HaywinGames.postman.json` (Collection + Environment in one file)

### Import Instructions
1. Open Postman
2. Click **Import**
3. Select `docs/HaywinGames.postman.json`
4. Collection and environment variables are automatically imported
5. Update `baseUrl` variable for your environment if needed

---

## API Quick Reference

### Base URL
```
Development: http://localhost:5000/api/v1
Production:  https://api.haywingames.com/api/v1
```

### Health Check
```http
GET /api/v1/health
```

### Authentication
```http
POST /api/v1/auth/login
POST /api/v1/auth/register
Authorization: Bearer <token>
```

### Game Endpoints
| Game | Base Path |
|------|-----------|
| Bingo | `/bingo`, `/gamerooms`, `/cards` |
| Keshkesh | `/keshkesh` |
| Spin | `/spin` |
| Material Lottery | `/material-lottery` |
| Ludo | `/ludo` |

---

## Getting Started (For New Team Members)

### Step 1: Read Overview
Start with `../README.md` for project overview

### Step 2: Understand Architecture
Read `HAYWIN_GAMES_HANDOVER.md` sections:
- System Architecture
- Platform Architecture
- Database Design

### Step 3: Setup Environment
Follow setup guides in:
- `../server/README.md` (Backend)
- `../client/README.md` (Frontend)

### Step 4: Test API
Import Postman collection and test endpoints

### Step 5: Explore Code
Start with key files:
- `server/routes/index.js` - All API routes
- `server/socketController/socketSetup.js` - Socket initialization
- `server/models/` - Database models
- `client/src/routes/AppRoutes.jsx` - Frontend routes

---

## Support

**Primary Contact:** Samuel Aberra  
**Documentation Version:** 1.0  
**Last Updated:** April 17, 2026

---

**INTERNAL DOCUMENTATION - CONFIDENTIAL**
