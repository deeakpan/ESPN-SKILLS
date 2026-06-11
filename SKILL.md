---
name: espn-match-results
description: >-
  Pharos-compatible agent skill: resolve sports match results from ESPN for prediction
  markets and on-chain oracle workflows. Discover fixtures by date and league, resolve
  event ids from team names, fetch final scores, period splits, and completion status
  across soccer, NBA, NFL, MLB, and more. Use when settling sports markets on Pharos,
  verifying game outcomes, finding ESPN event ids, or building composable resolution
  pipelines for Phase 2 on-chain agents.
---

# ESPN match results (Pharos skill)

Reusable agent skill for Pharos — discover a match, fetch the official ESPN scoreline, and return structured facts on-chain agents can grade against.

Built for **prediction markets** on Pharos: parlays, props, match-winner markets, and any agent that needs *who won, final score, half-time splits, is the game finished?*

Unofficial ESPN Site API — no auth. Cache aggressively; handle 400/404 defensively.

**Reference:** [reference.md](reference.md)  
**CLI:** `node scripts/resolve-match.mjs`

## Resolution workflow

```
1. League slug        →  soccer/eng.1, basketball/nba, football/nfl, …
2. Scoreboard by date →  GET …/{league}/scoreboard?dates=YYYYMMDD
3. Event id           →  filter events[] by team name(s)
4. Settle facts       →  scoreboard/{id} and/or summary?event={id}
```

No event id required to start. **Date + league** returns every game that day with `events[].id`.

## Step 1 — List matches on a date

```text
GET https://site.api.espn.com/apis/site/v2/sports/{league_slug}/scoreboard?dates=YYYYMMDD
```

Range: `dates=20250429-20250505`

| Field | Use for resolution |
|--------|---------------------|
| `id` | Stable event key for detail fetches |
| `name` | Human label (`"Away at Home"`) |
| `date` | Kickoff timestamp |
| `competitions[0].competitors` | Teams, scores, `homeAway` |
| `competitions[0].status.type` | Finished? (`STATUS_FULL_TIME`, etc.) |

**Soccer:** always include league slug (`soccer/eng.1` — not `soccer` alone).

## Step 2 — Resolve event id from team names

Filter scoreboard `events[]`:

- `competitors[].team.displayName` (substring, case-insensitive)
- `event.name` / `shortName`
- Try aliases (`"Paris Saint-Germain"` / `"PSG"`)

```bash
node scripts/resolve-match.mjs \
  --league soccer/uefa.champions \
  --date 20250429 \
  --team "Arsenal" \
  --team "PSG"
```

## Step 3 — Facts for market settlement

### Final score (all sports)

```text
GET …/{league}/scoreboard/{eventId}
```

| JSON path | Resolution fact |
|-----------|-----------------|
| `competitors[home].score` | Home final (map via `homeAway`) |
| `competitors[away].score` | Away final |
| `status.type.name` | Game state / FT confirmation |
| `competitors[n].linescores[]` | Period splits (quarters, innings) |

### Soccer — halves + goals

```text
GET …/{league}/summary?event={eventId}
```

| JSON path | Resolution fact |
|-----------|-----------------|
| `header…competitors[n].score` | Final goals |
| `header…linescores[0].displayValue` | 1st-half goals |
| `header…linescores[1].displayValue` | 2nd-half goals |
| scoreboard `details[]` | Goal times (`clock.displayValue`) |

### NBA / NFL — quarters

`linescores[0..3]` = Q1–Q4; index 4 = OT.

### MLB — innings

`linescores[0..8]` = innings 1–9+.

## Finished vs live

| `status.type.name` | Market implication |
|--------------------|--------------------|
| `STATUS_SCHEDULED` | Do not settle |
| `STATUS_IN_PROGRESS` / `STATUS_HALFTIME` | Live only |
| `STATUS_FULL_TIME` / `STATUS_FINAL` | Safe to settle (regulation FT) |
| `STATUS_FINAL_AET` | Settle on posted score (includes ET) |
| `STATUS_FINAL_PEN` | Score may be level; check market rules |

## Structured output (for oracles / agents)

```json
{
  "eventId": "733616",
  "league": "soccer/uefa.champions",
  "home": "Arsenal",
  "away": "Paris Saint-Germain",
  "homeScore": 0,
  "awayScore": 1,
  "status": "STATUS_FULL_TIME",
  "completed": true,
  "kickoff": "2025-04-29T19:00Z",
  "halfTime": { "home": 0, "away": 1 },
  "scoreboardUrl": "…",
  "summaryUrl": "…"
}
```

Produce this via `node scripts/resolve-match.mjs … --json`.

## Common leagues

See [reference.md](reference.md) — EPL, UCL, World Cup, La Liga, Serie A, Bundesliga, NBA, NFL, MLB, NHL, and more.

## Play-by-play (optional props)

| Sport | Source |
|-------|--------|
| Soccer goal times | Scoreboard `details[]` |
| NBA clock | Summary `plays[]` |
| NFL | Core API plays endpoint |
| MLB | Summary `plays[]` |

## Errors

| Issue | Fix |
|-------|-----|
| HTTP 400 (soccer) | Add league slug |
| Empty `events` | Wrong date; try ±1 day |
| Team not found | Broaden name; try another league slug |
| Multiple matches | Add second `--team` filter |
