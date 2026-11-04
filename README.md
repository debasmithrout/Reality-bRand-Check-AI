# Reality bRand Check AI

AI-powered brand governance platform that reviews content against approved brand guidelines, terminology, facts, and assets, explains potential issues, and supports human approval before publication.

---

## Project Structure

```text
Reality-bRand-Check-AI/
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── common/
│       │   ├── dashboard/
│       │   ├── brand/
│       │   ├── review/
│       │   └── layout/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── types/
│       └── utils/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── ai/
│   │   └── main.py
│   └── tests/
├── docs/
├── .github/
│   └── pull_request_template.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Branch Structure & Responsibilities

| Branch | Description / Responsibilities | Owner / Assignee |
| :--- | :--- | :--- |
| `main` | Production-ready stable release branch | Repository Maintainers |
| `develop` | Central team integration branch | Core Team |
| `feature/backend` | Backend APIs, database integration, schemas, routers, and core services | Debasmith Rout |
| `feature/ai-engine` | Brand guideline parsing, LLM verification pipelines, and AI scoring | Sadar Babu |
| `feature/frontend` | Client-side UI/UX, dashboard, brand management views, review screens | Minakshi Thakur |
| `feature/testing-docs` | Automated test suites (unit & integration), architecture & API documentation | Vishal |

---

## Git Workflow Rules

1. **Branch Origin:** All feature branches (`feature/*`) must branch off from `develop`.
2. **Pull Requests:** 
   - Target pull requests to `develop`, never directly to `main`.
   - Use the provided PR template (`.github/pull_request_template.md`).
3. **No Direct Pushes to `main`:** Direct commits or pushes to `main` are strictly prohibited.
4. **Environment Variables:** Never commit secrets or `.env` files. Use `.env.example` as a template for local configuration.
5. **Clean Merges:** Rebase or merge from `develop` frequently to keep feature branches up to date and resolve conflicts early.
