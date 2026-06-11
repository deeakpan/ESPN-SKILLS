# ESPN-SKILLS

**Standalone agent skill for Pharos** — a reusable, composable module that lets any AI agent resolve sports match results from ESPN.

Built for **prediction markets** and on-chain oracles that need trustworthy public score data to settle outcomes. No API key. No event id required to start: use **date + league + team names** to discover the game, then fetch **final score**, **period splits**, and **finished status**.

## Built for Pharos

Pharos powers the AI Agent economy — on-chain payments, social interactions, and intelligent agents at scale. This skill is the **resolution layer** for sports betting and prediction-market agents:

| Pharos agent need | What this skill delivers |
|-------------------|--------------------------|
| Callable tool | `scripts/resolve-match.mjs` → structured JSON any agent can parse |
| Reusable module | Standard `SKILL.md` — drop into Cursor, Claude Code, or custom bots |
| On-chain settlement | Final score, HT splits, `completed` flag — facts contracts can grade |
| Composability | Phase 2 agents combine with wallet, registry, and payout skills |

## Why prediction markets use this

| Need | How ESPN-SKILLS helps |
|------|------------------------|
| Find the right game | `scoreboard?dates=YYYYMMDD` → filter by team names → `eventId` |
| Final score | Scoreboard / summary JSON paths (sport-specific) |
| Half-time / quarters | `linescores` or summary `header` (soccer) |
| Confirm game ended | `status.type.name` (`STATUS_FULL_TIME`, `STATUS_FINAL`, …) |
| Agent automation | `SKILL.md` + `scripts/resolve-match.mjs` |

Works for soccer, NBA, NFL, MLB, NHL, and more — see [reference.md](reference.md).

## Quick start

```bash
git clone https://github.com/deeakpan/ESPN-SKILLS.git
cd ESPN-SKILLS

# Resolve a match by date + teams
node scripts/resolve-match.mjs \
  --league soccer/uefa.champions \
  --date 20250429 \
  --team Arsenal \
  --team PSG

# JSON output for agent / oracle pipelines
node scripts/resolve-match.mjs --league soccer/eng.1 --event 740902 --json
```

Example agent output:

```json
{
  "eventId": "733616",
  "home": "Arsenal",
  "away": "Paris Saint-Germain",
  "homeScore": 0,
  "awayScore": 1,
  "status": "STATUS_FULL_TIME",
  "completed": true,
  "halfTime": { "home": 0, "away": 1 }
}
```

## Use with AI agents

| Platform | How |
|----------|-----|
| **Pharos / any on-chain agent** | Register `resolve-match.mjs` as a tool; feed JSON into settlement logic |
| **Cursor** | Copy `SKILL.md` to `.cursor/skills/espn-match-results/SKILL.md` |
| **Claude Code / LLM + shell** | Point at `SKILL.md`; run the CLI on match day |
| **Custom bots** | Wrap the script; return the JSON payload to your agent runtime |

## Files

| File | Purpose |
|------|---------|
| [SKILL.md](SKILL.md) | Full agent instructions (Phase 1 deliverable) |
| [reference.md](reference.md) | League slugs + JSON paths |
| [scripts/resolve-match.mjs](scripts/resolve-match.mjs) | CLI: date/teams → result JSON |

## Phase 2 vision

Combine this skill with wallet and registry modules to build a **sports prediction agent on Pharos**:

1. Agent lists upcoming fixtures and opens markets
2. Users stake on outcomes
3. At full time, agent calls `espn-match-results` → settles positions on-chain

## License

Unofficial ESPN API — use at your own risk; cache responsibly.
