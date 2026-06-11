#!/usr/bin/env node
/**
 * Resolve ESPN event id from league + date + team names; print match result.
 *
 *   node scripts/resolve-match.mjs --league soccer/eng.1 --date 20251108
 *   node scripts/resolve-match.mjs --league soccer/uefa.champions --date 20250429 --team Arsenal --team PSG
 *   node scripts/resolve-match.mjs --league basketball/nba --date 20260120 --team Lakers
 *   node scripts/resolve-match.mjs --event 740902 --league soccer/eng.1
 */
const BASE = "https://site.api.espn.com/apis/site/v2/sports";

function parseArgs(argv) {
  const out = { teams: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--league") out.league = argv[++i];
    else if (a === "--date") out.date = argv[++i]?.replace(/-/g, "");
    else if (a === "--team") out.teams.push(argv[++i]);
    else if (a === "--event") out.event = argv[++i];
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function usage() {
  console.log(`Usage:
  node scripts/resolve-match.mjs --league <slug> --date YYYYMMDD [--team Home] [--team Away]
  node scripts/resolve-match.mjs --league <slug> --event <id>

Options:
  --json    Print JSON only
  --help    This message
`);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function teamMatches(displayName, query) {
  const d = norm(displayName);
  const q = norm(query);
  return d.includes(q) || q.includes(d);
}

function competitors(ev) {
  return ev.competitions?.[0]?.competitors ?? [];
}

function homeAway(comp) {
  const home = comp.find((c) => c.homeAway === "home");
  const away = comp.find((c) => c.homeAway === "away");
  return { home, away };
}

function eventMatchesTeams(ev, teams) {
  if (!teams.length) return true;
  const { home, away } = homeAway(competitors(ev));
  const names = [home?.team?.displayName, away?.team?.displayName, ev.name, ev.shortName].filter(Boolean);
  const blob = names.map(norm).join(" ");
  return teams.every((t) => blob.includes(norm(t)) || names.some((n) => teamMatches(n, t)));
}

function pickJsonPath(root, path) {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function isSoccerLeague(league) {
  return league.startsWith("soccer/");
}

async function loadEvent(league, eventId) {
  const sb = await fetchJson(`${BASE}/${league}/scoreboard/${eventId}`);
  const comp = sb.competitions?.[0];
  if (!comp && !sb.events?.[0]) throw new Error(`No competition for event ${eventId}`);
  return sb.events?.[0] ?? { id: eventId, name: sb.name, date: sb.date, competitions: sb.competitions };
}

async function listEventsOnDate(league, date) {
  const url = `${BASE}/${league}/scoreboard?dates=${date}`;
  const data = await fetchJson(url);
  return data.events ?? [];
}

function buildResult(league, ev, extra = {}) {
  const comp = ev.competitions?.[0];
  const { home, away } = homeAway(competitors(ev));
  const status = comp?.status?.type ?? {};
  const hs = Number(home?.score);
  const as = Number(away?.score);
  return {
    eventId: String(ev.id),
    league,
    name: ev.name ?? ev.shortName,
    home: home?.team?.displayName ?? "?",
    away: away?.team?.displayName ?? "?",
    homeScore: Number.isFinite(hs) ? hs : null,
    awayScore: Number.isFinite(as) ? as : null,
    status: status.name ?? null,
    statusDetail: status.detail ?? status.description ?? null,
    completed: Boolean(status.completed),
    kickoff: comp?.date ?? ev.date ?? null,
    scoreboardUrl: `${BASE}/${league}/scoreboard/${ev.id}`,
    summaryUrl: `${BASE}/${league}/summary?event=${ev.id}`,
    ...extra,
  };
}

async function enrichSoccer(league, ev, result) {
  try {
    const sum = await fetchJson(result.summaryUrl);
    const hc = sum.header?.competitions?.[0]?.competitors ?? [];
    const mapBy = (side) => hc.find((c) => c.homeAway === side);
    const h = mapBy("home");
    const a = mapBy("away");
    const htH = pickJsonPath(sum, "header.competitions[0].competitors[0].linescores[0].displayValue");
    const htA = pickJsonPath(sum, "header.competitions[0].competitors[1].linescores[0].displayValue");
    result.summaryHomeScore = h?.score != null ? Number(h.score) : null;
    result.summaryAwayScore = a?.score != null ? Number(a.score) : null;
    result.halfTime = {
      home: htH != null ? Number(htH) : null,
      away: htA != null ? Number(htA) : null,
    };
    const details = ev.competitions?.[0]?.details ?? [];
    result.goalTimes = details
      .filter((d) => d?.scoringPlay)
      .map((d) => ({
        clock: d.clock?.displayValue,
        team: d.team?.displayName,
      }));
  } catch {
    /* summary optional */
  }
  return result;
}

async function enrichQuarters(ev, result) {
  const { home, away } = homeAway(competitors(ev));
  result.periods = {
    home: (home?.linescores ?? []).map((l) => l.displayValue),
    away: (away?.linescores ?? []).map((l) => l.displayValue),
  };
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.league) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const league = args.league.replace(/^\/+/, "");
  let ev;

  if (args.event) {
    ev = await loadEvent(league, args.event);
  } else if (args.date) {
    const events = await listEventsOnDate(league, args.date);
    const hits = events.filter((e) => eventMatchesTeams(e, args.teams));
    if (!hits.length) {
      console.error(`No match on ${args.date} in ${league} for teams: ${args.teams.join(", ") || "(any)"}`);
      console.error(`Events that day: ${events.length}`);
      for (const e of events.slice(0, 8)) {
        const { home, away } = homeAway(competitors(e));
        console.error(`  - ${e.id}: ${home?.team?.displayName} vs ${away?.team?.displayName}`);
      }
      process.exit(1);
    }
    if (hits.length > 1 && args.teams.length < 2) {
      console.error("Multiple matches — add --team filters:");
      for (const e of hits) {
        const { home, away } = homeAway(competitors(e));
        console.error(`  ${e.id}: ${home?.team?.displayName} vs ${away?.team?.displayName}`);
      }
      process.exit(1);
    }
    ev = hits[0];
  } else {
    console.error("Provide --date YYYYMMDD or --event <id>");
    process.exit(1);
  }

  let result = buildResult(league, ev);
  if (isSoccerLeague(league)) result = await enrichSoccer(league, ev, result);
  else result = await enrichQuarters(ev, result);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
