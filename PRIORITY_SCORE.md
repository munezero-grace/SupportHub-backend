# Priority Score System

## What it does

Every ticket gets a priority score between **0.0 and 1.0**. The score is computed automatically by the AI engine when a ticket is created or updated. Higher score = needs attention sooner.

## The three factors

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| **Emotion** | 40% | How frustrated or urgent the writer's tone is — based on word choice, not the topic itself |
| **Complexity** | 35% | How severe the technical problem is — data loss and outages score highest, cosmetic issues lowest |
| **Age** | 25% | How long the ticket has been open — saturates at 14 days (a 14-day-old ticket gets full 1.0 on this factor) |

Formula: `priorityScore = 0.4 × emotion + 0.35 × complexity + 0.25 × age`

## Score tiers

| Tier | Score range | Meaning |
|------|-------------|---------|
| Critical | ≥ 0.80 | Needs immediate attention |
| High | 0.55 – 0.79 | Address today |
| Medium | 0.25 – 0.54 | Address this week |
| Low | < 0.25 | Address when time allows |

## Age escalation

Tickets that have been sitting open for a long time will naturally escalate in score even if nothing else changes. A Medium-complexity ticket open for 14+ days will score higher than a fresh ticket of the same severity — this is intentional so stale tickets don't fall through the cracks.

## API endpoint

`GET /api/tickets/ranked` — returns all tickets sorted by `priorityScore` descending. Requires a valid JWT bearer token (admin or ticket-manager role).

Each ticket in the response includes:
- `priorityScore` — float 0–1
- `lastScoredAt` — ISO timestamp of when the score was last computed

## Environment variables

```
GROQ_API_KEY=""     # Your Groq API key
GROQ_MODEL=""       # Model to use (defaults to llama-3.1-8b-instant if blank)
```
