# Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn
- Python 3.10+ (for ML pipeline only)

## Quick Start

### 1. Server
```bash
cd server
cp .env.example .env
npm install
npm run dev
# → Running on http://localhost:3001
```

### 2. Client
```bash
cd client
npm install
npm run dev
# → Running on http://localhost:5173
```

### 3. ML Pipeline (Dev 2 only)
```bash
cd ml
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Verification
1. Open http://localhost:5173 — see the landing page
2. Create a room → opens room view with placeholder video grid
3. Server health: http://localhost:3001/api/health → `{"status":"ok"}`
