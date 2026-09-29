# Obligation OS

One timeline for every bill, renewal, expiry and appointment, sequenced by what costs you most if you miss it.
Built for HACKXPRESS 1.0, problem statement 3: Fragmented Life Administration & Obligation Fatigue.

## The problem
People juggle dozens of obligations across email, SMS, WhatsApp and paper. Reminders treat each one alone, so clashes, penalties and missed savings go unseen.

## What it does
1. **Aggregate:** paste messages from any channel; an LLM extracts title, due date, amount, penalty and source.
2. **Contextualize:** each item gets a 0-100 priority score (deadline pressure 55, consequence of missing 30, money at stake 15).
3. **Sequence:** a ranked action plan, a week-by-week timeline, and warnings for weeks where payments pile up.
4. **Act:** savings tips, mark-as-done, and .ics export for calendar reminders.

## Architecture
```
Browser (Next.js UI) --> POST /api/extract --> Gemini or Claude (JSON output)
                                          \--> rule-based parser (fallback if no key or API error)
         lib/scoring.ts  priority score, crunch detection, tips
         lib/ics.ts      calendar export
State: localStorage (per browser, no login)
```
Validation: zod on request and on every LLM item. Keys stay server-side in env vars.

## Run locally
```
npm install
cp .env.example .env.local   # add GEMINI_API_KEY or ANTHROPIC_API_KEY (optional)
npm run dev
```
Deploy: import the repo in Vercel, add the env var, deploy. Works without a key using the rule parser.

## Scalability and future scope
Gmail/Outlook and WhatsApp connectors, DigiLocker document expiry, multi-user accounts with a database, push notifications, autopay hand-off.
