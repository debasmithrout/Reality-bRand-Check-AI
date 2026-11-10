# Reality bRand Check AI - Frontend

Frontend user interface for **Reality bRand Check AI** — an AI-powered brand governance platform that helps businesses verify marketing content against their brand guidelines, terminology, approved facts, and brand identity.

> **Tagline:** Verify Your Brand. Before the World Sees It.

## Tech Stack
- **React 19**
- **Vite**
- **TypeScript**
- **Tailwind CSS**
- **React Router**

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The application will run locally at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```

## Structure
```
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── brand/
│   │   └── review/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Status & Demo Mode Note
Currently in basic frontend foundation mode. Features, content reviews, and dashboard data use clearly labeled sample/mock data. Backend FastAPI and AI integrations will be linked in upcoming milestones.

