# ESPN API reference (agent quick lookup)

Base: `https://site.api.espn.com/apis/site/v2/sports`

## League slugs (common)

### Soccer (always `soccer/{league}`)

| League | Slug |
|--------|------|
| Premier League | `soccer/eng.1` |
| Championship | `soccer/eng.2` |
| La Liga | `soccer/esp.1` |
| Serie A | `soccer/ita.1` |
| Bundesliga | `soccer/ger.1` |
| Ligue 1 | `soccer/fra.1` |
| Champions League | `soccer/uefa.champions` |
| Europa League | `soccer/uefa.europa` |
| FIFA World Cup | `soccer/fifa.world` |
| MLS | `soccer/usa.1` |

### US sports

| Sport | Slug |
|-------|------|
| NFL | `football/nfl` |
| College football | `football/college-football` |
| NBA | `basketball/nba` |
| WNBA | `basketball/wnba` |
| MLB | `baseball/mlb` |
| NHL | `hockey/nhl` |

### Other

| Sport | Slug |
|-------|------|
| UFC | `mma/ufc` |
| PGA | `golf/pga` |
| ATP tennis | `tennis/atp` |

## Endpoints

| Purpose | URL |
|---------|-----|
| Fixtures / results on date | `GET /{league}/scoreboard?dates=YYYYMMDD` |
| Date range | `GET /{league}/scoreboard?dates=YYYYMMDD-YYYYMMDD` |
| Single event (scores inline) | `GET /{league}/scoreboard/{eventId}` |
| Deep match data | `GET /{league}/summary?event={eventId}` |
| Teams list | `GET /{league}/teams` |
| Team schedule | `GET /{league}/teams/{teamId}/schedule` |
| Soccer all comps schedule | `GET /soccer/all/teams/{teamId}/schedule` |

NFL week filter: `?seasontype=2&week=5`

## JSON paths by sport

### Final score (all sports)

```
competitions[0].competitors[<home>].score
competitions[0].competitors[<away>].score
```

Use `homeAway` === `"home"` | `"away"` to find indices.

### Soccer halves (summary)

```
header.competitions[0].competitors[<home>].linescores[0].displayValue  # 1H
header.competitions[0].competitors[<home>].linescores[1].displayValue  # 2H
```

### Soccer goal times (scoreboard)

```
competitions[0].details[]  where scoringPlay === true
  → clock.displayValue  (e.g. "32'")
```

### NBA / NFL quarters (scoreboard)

```
competitors[n].linescores[0..3].displayValue   # Q1–Q4
```

### MLB innings (scoreboard)

```
competitors[n].linescores[0..8].displayValue  # innings 1–9+
```

### Soccer cards (summary)

```
boxscore.teams[n].statistics  → find name yellowCards / redCards
```

Prefer matching by `team.displayName`, not fixed statistic index.

## Core API (play-by-play)

```text
GET https://sports.core.api.espn.com/v2/sports/{sport}/leagues/{league}/events/{eventId}/competitions/{eventId}/plays?limit=500
```

NFL play-by-play; soccer uses scoreboard `details` instead.

## Date format

`YYYYMMDD` in UTC calendar sense (ESPN groups by US broadcast dates for some US sports — if empty, try ±1 day).
