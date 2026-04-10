# AGENTS.md

## Project overview
This is a React + Vite web app for Hunt Models.
Main source code is in `src/`.
Database schema lives in `schema.sql`.
Business requirements are in `docs/specifica-hunt-models.md`.

## Stack
- Frontend: React + Vite
- Routing: react-router / react-router-dom
- Database/auth: Supabase
- Environment files: `.env.local`, `.env.example`

## Important business rules
- Model types are mutually exclusive: agency-only, MD school, or agent.
- MD and agent cannot both be assigned to the same model.
- Commissions are calculated per payment received, not on total contract value.
- MD periods start from first recorded payment.
- Agent periods start from first confirmed job.
- Contract renewals are 2 years, with warning 60 days before expiry.
- Read the full rules in `docs/specifica-hunt-models.md` before editing business logic.

## Working rules
- First inspect current code before proposing changes.
- Reuse existing patterns and file structure.
- Do not rewrite unrelated files.
- Before changing DB logic, inspect `schema.sql`.
- When implementing a feature, list impacted files first.
- After edits, run build and relevant checks.

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`

## Definition of done
A task is done only if:
1. code is updated,
2. affected flows are checked,
3. build passes,
4. the implementation matches `docs/specifica-hunt-models.md`.