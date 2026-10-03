# San Francisco Home Games

## Reproduce

Requires Python 3.9+ with the system IANA timezone database; no pip dependencies.

```sh
cd /path/to/spiral
python3 scripts/update-sports.py --self-test
python3 scripts/update-sports.py --as-of 2026-09-27
python3 scripts/update-sports.py --validate
```

Default: a rolling ten-calendar-year window, starting on today's month/day ten
years ago and ending yesterday in `America/Los_Angeles`. Thus this snapshot
requests 2016-09-27 through 2026-09-26 inclusive. `--start`, `--end`, and `--as-of`
are supported. Future/current-day cutoffs are rejected even with an overridden
as-of date. A historical rerun uses the provider's current corrected records,
not a historical snapshot of what was known then.

The script writes only `data/sports.json` and `data/sports.js`. The latter assigns
the identical object to `window.SF_SPORTS`. Stable sorting and provider game IDs
make the game selection reproducible for unchanged upstream responses. Fetch
timestamps and response hashes naturally change. No games are synthesized.

## Sources

- [Official MLB StatsAPI](https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=137&season=2026&hydrate=venue): full-year Giants schedules, including postseason. Team ID 137; SF venue ID 2395.
- [Official MLB game types](https://statsapi.mlb.com/api/v1/gameTypes): `R` is regular season; `F/D/L/W/C/P` are postseason. All other types are excluded.
- [Official NBA schedule CDN](https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json) and [WNBA schedule CDN](https://cdn.wnba.com/static/json/staticData/scheduleLeagueV2_1.json): availability probes. Both returned HTTP 403 in this environment. The unversioned schedule files and legacy mobile schedule endpoints also returned 403 during research; NBA Stats leaguegamelog timed out. Current CDN files are not historical archives. The script does not ingest these probe responses.
- [ESPN Warriors schedule](https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/gs/schedule?season=2021&seasontype=5): historical fallback. NBA season is its ending year. Separate queries use `seasontype=2` (regular), `3` (postseason), and `5` (play-in). Crucially, querying only type 3 misses play-in games.
- [ESPN Valkyries schedule](https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/gsv/schedule?season=2025&seasontype=2): calendar-year seasons; regular and postseason queried separately.
- If MLB's official request fails, ESPN MLB team `sf` is used for that year and phase. ESPN is an unofficial public API without an availability guarantee.

Every data request records URL, status, HTTP response date, provider timestamp
when present, and SHA-256 of the response bytes. Games and coverage reference
these records by `source`. Failed official probes remain visible even when the
fallback succeeds. HTTP Date verifies service access, not that a schedule is
complete or independently correct. Each event's season/phase/team is checked;
ESPN's top-level `season` can describe the current season even on historical
requests and is deliberately not trusted.

## Inclusion Rules

- Only provider-confirmed completed games, with scores, home designation, and
  a verified SF venue. No preseason, exhibitions, All-Star or Summer League.
  Cancelled/postponed unplayed events and future/in-progress games are excluded.
  Completed MLB games shortened by weather are included.
- Giants: stable MLB venue ID 2395, named AT&T Park or Oracle Park. Home-designated
  games outside SF are not counted. ESPN fallback requires an exact venue name
  plus San Francisco city.
- Warriors: Chase Center plus San Francisco city, from 2019-10-24 onward.
  [NBA's inaugural regular-season game record](https://www.nba.com/game/lac-vs-gsw-0021900016)
  verifies the boundary. Oakland, neutral sites, and the 2020 bubble are excluded.
- Valkyries: Chase Center plus San Francisco city, from 2025-05-16 onward.
  Their [2025 first-round home playoff game was relocated to SAP Center in San Jose](https://valkyries.wnba.com/news/valkyries-clinch-postseason-berth-20250904),
  and is correctly excluded despite being a home game.
- `date` is the start timestamp converted to `America/Los_Angeles`, respecting
  daylight saving time, not the UTC date or the ESPN display date.
- `phase` is `regular`, `postseason`, or `play-in`; `phaseDetail` preserves round
  descriptions. Cup games that the source classifies as regular season remain
  regular season. Neutral cup finals are excluded by venue.
- Distinct game IDs preserve doubleheaders. `sameDayGameIds` records same-day
  matches both within and across teams; these are calendar overlaps, not claims
  that the games' actual playing times overlap.

## Coverage Semantics

Top-level `start` and `end` are the requested window, NOT a blanket completeness
claim. Use `coverage` and `summary.lastGame` when labeling charts.

Coverage partitions each team's eligible period by season and phase. MLB/WNBA
use calendar years. Warriors use July-June windows, with the first SF window
starting 2019-10-24. The Warriors did not take part in the 2020 summer restart;
the atypical 2019-20 season therefore introduces no omitted SF games at that
July boundary. Records contain source-event counts, included counts, excluded
counts, last completed team/home dates, and request provenance.

| Status | Meaning |
| --- | --- |
| `complete` | Successful validated response with included SF games in the window; no unresolved past home games detected. Source-based coverage, not an independent historical census. |
| `no_sf_games` | Validated schedule supplies no eligible SF games in this period/phase, including away-only games, relocated home games, or a season not yet started. |
| `no_games_reported` | ESPN returned a successful empty array but omitted `requestedSeason`. Ambiguous absence; `verifiedThrough` is null, not a claim of proven zero. |
| `not_applicable` | Before the first eligible SF regular-season home game; a structural exclusion, not missing data. |
| `unavailable` | Request or schema validation failed; never interpret as zero games. |
| `partial` | Stale HTTP date, unknown home venue, or unresolved past home game. Inspect warnings; do not treat absence as zero. |

`verifiedThrough` is populated only for validated non-ambiguous source coverage.
Empty responses alone remain ambiguous. Seven specific historical Warriors
absences are independently established by official NBA records, recorded in
`verification` with a citation and review date. For a season whose validated
regular-season schedule has not begun by the cutoff, empty playoff/play-in
responses are confirmed zero only through that cutoff, with
`phaseStatus: "not_yet_started"`. Nonzero exit code
indicates unavailable or partial coverage, after writing the usable data and its
gap records. Empty ambiguous responses remain separately labeled but do not
cause a failing exit code.

## Limitations

- A final event can appear or be corrected after this snapshot; rerun to refresh.
  No schedule-size assumption is used to invent missing games, including pandemic
  seasons and currently unpublished schedules.
- Start timestamps can be scheduled times rather than actual first pitch/tipoff.
  A game crossing midnight belongs to its local starting day. The APIs do not
  consistently expose completion timestamps, so final status plus a start date
  through yesterday is the practical cutoff rule.
- Suspended/resumed MLB games retain one provider ID and their original start
  day, with resumption fields retained when supplied. A supplied resume date
  after the cutoff excludes the event. This is a game dataset, not a per-day
  stadium-attendance/session dataset: it does not create a second game for a
  later resumed session.
- Team home designation is required as well as venue. A Giants away-designated
  game physically played at Oracle Park does not become a Giants home game.
- The official basketball probes document availability; historical ingestion
  uses ESPN until an accessible, versioned official archive is implemented.
- ESPN event `401161505` (Kings at Warriors, 2020-02-25) incorrectly supplies
  Smoothie King Center, New Orleans. The [official NBA box score](https://www.nba.com/game/sac-vs-gsw-0021900863/box-score)
  establishes Chase Center, San Francisco. A correction is keyed to this exact
  event, date, and both team IDs; its original venue and citation remain in
  `venueCorrection`. This restores a real game, not an assumed missing fixture.
  ESPN's time/status detail also appears inconsistent for this event; the start
  timestamp is retained from ESPN, but its Pacific calendar date agrees with NBA.
- The [2020-09-25 second Giants-Padres game](https://www.mlb.com/news/padres-series-vs-mariners-moved-to-san-diego)
  was physically in SF but designated a Padres home game. Only the Giants-home
  first game is included. Doubleheader flags do not imply both games qualify.

## Snapshot Validation

Fetched on 2026-09-27; the system clock and successful API HTTP dates agree on
that date. The APIs actually supply 2026 completed results. The requested end
is 2026-09-26, not an assumed or synthetic data extension.

| Team | Regular | Postseason | Play-in | Total | Last SF home game |
| --- | ---: | ---: | ---: | ---: | --- |
| Giants | 764 | 5 | 0 | 769 | 2026-09-26 |
| Warriors | 275 | 23 | 2 | 300 | 2026-04-09 |
| Valkyries | 44 | 0 | 0 | 44 | 2026-09-19 |
| Total | 1,083 | 28 | 2 | 1,113 | |

There are 49 multi-team dates. Four dates retain two eligible Giants home games
(2018-04-28, 2020-08-27, 2024-07-27, 2026-08-29). Another doubleheader on
2020-09-25 has only one eligible Giants-home game, as explained above.

Coverage has 52 records: 27 `complete`, 23 `no_sf_games`, and 2 `not_applicable`.
No data partitions are `unavailable`, `partial`, or `no_games_reported` in this
run. Regular-season source coverage extends through 2026-09-26 for all teams;
that differs from each team's most recent actual SF game. Valkyries postseason
is also source-verified through the cutoff: its 2026 fixtures begin afterward.

The originally ambiguous ESPN responses have been resolved without extrapolating
from an empty array:

| NBA ending season | Phase | Independent evidence |
| --- | --- | --- |
| 2020 | Postseason and play-in | [Official season review's complete brackets](https://www.nba.com/news/history-season-review-2019-20) omit Golden State. |
| 2021 | Postseason | [Official elimination-game record](https://www.nba.com/game/0052000211). |
| 2022 | Play-in | [Official third-seed playoff matchup](https://www.nba.com/playoffs/2022/west-first-round-3). |
| 2023 | Play-in | [Official sixth-seed playoff matchup](https://www.nba.com/playoffs/2023/series). |
| 2024 | Postseason | [Official elimination-game record](https://www.nba.com/game/gsw-vs-sac-0052300131). |
| 2026 | Postseason | [Official play-in results](https://www.nba.com/news/2026-nba-playoffs-schedule). |
| 2027 | Postseason and play-in | Validated regular schedule starts 2026-10-21, after this snapshot's cutoff; `phaseStatus` is `not_yet_started`. |

Each correction retains `originalStatus: "no_games_reported"`. Historical
verification facts are explicitly curated in the script and dated 2026-09-27;
the script does not pretend to re-scrape those articles on every run. These are
phase-specific absences, not declarations that the team played no regular-season
games in that whole date window. No future fixtures are counted.

`--validate` checks unique IDs, SF venues, eligibility boundaries, scores, local
dates, completed/home flags, coverage totals, same-day links, historical game
sentinels, and JSON/JavaScript equality. `--self-test` checks local-date rollover,
leap dates, doubleheader preservation, venue/home/neutral filters, postponed and
cancelled games, shortened MLB finals, excluded spring training, cutoffs,
phase-schema rejection, the sourced venue correction, and ambiguous coverage.

## Minimal Browser Integration

Do not use `c.status !== "failed"`: no such status is emitted, and that predicate
would incorrectly accept `partial`, `unavailable`, and `no_games_reported`.
Never use coverage to filter or suppress `games`. Draw every known game first;
coverage determines whether remaining blanks/counts are complete or uncertain.
If known games exist on an incompletely covered day, display them and optionally
mark the count as a lower bound.

Coverage is per team AND phase. A confirmed-zero postseason record spanning a
season must not override regular-season/play-in games. Require all relevant
phases to be safe before claiming a team's empty day is truly zero:

```js
function sportsCovered(day, team, data = window.SF_SPORTS) {
  if (!data || day < data.start || day > data.end) return false;
  const records = data.coverage.filter(c =>
    c.team === team && c.start <= day && day <= c.end);
  if (records.some(c => c.phase === "all" &&
      c.status === "not_applicable")) return true;
  const phases = team === "warriors"
    ? ["regular", "postseason", "play-in"]
    : ["regular", "postseason"];
  return phases.every(phase => {
    const matches = records.filter(c => c.phase === phase);
    return matches.length > 0 && matches.every(c =>
      ["complete", "no_sf_games"].includes(c.status) &&
      c.verifiedThrough != null && day <= c.verifiedThrough);
  });
}
```

For an all-team combined day, require
`Object.keys(data.teams).every(team => sportsCovered(day, team, data))`.
This snapshot covers every requested day under that predicate. A future failed
or partial refresh correctly changes coverage to false without hiding known
games. Unresolved responses remain unsafe; never whitelist `no_games_reported`.
The script includes a Python equivalent and tests unknown, partial, verified
absence, and out-of-range cases. Warriors metadata now uses official blue
`#1D428A`; application styling is untouched.
